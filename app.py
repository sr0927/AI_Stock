from flask import Flask, render_template, jsonify, request
import requests
import random
import yfinance as yf
import numpy as np
import pandas as pd
import pandas_ta as ta
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
from keras.layers import LSTM, Dense
from azure.core.credentials import AzureKeyCredential
from azure.ai.textanalytics import TextAnalyticsClient
import re
import base64
import json
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

app = Flask(__name__)

# Azure Text Analytics配置
endpoint = 'https://2024newstest.cognitiveservices.azure.com/'
key = '518904cfc7424b4f9699792271f14a43'
text_analytics_client = TextAnalyticsClient(endpoint, AzureKeyCredential(key))

# Azure OpenAI配置
GPT4V_KEY = "25ac43bedc994592aa55929a2e1e95e7"
GPT4V_ENDPOINT = "https://2024stockai.openai.azure.com/openai/deployments/stock-test/chat/completions?api-version=2024-02-15-preview"
headers = {
    "Content-Type": "application/json",
    "api-key": GPT4V_KEY,
}

# 下载和预处理数据的函数
def download_and_preprocess_data(stock_symbol, start_date, end_date):
    data = yf.download(stock_symbol, start=start_date, end=end_date)
    close_prices = data['Close'].values.reshape(-1, 1)
    scaler = MinMaxScaler(feature_range=(0, 1))
    close_prices_scaled = scaler.fit_transform(close_prices)
    return close_prices, close_prices_scaled, scaler

# 创建LSTM输入数据的函数
def create_lstm_data(data, time_steps=1):
    x, y = [], []
    for i in range(len(data) - time_steps):
        x.append(data[i:(i + time_steps), 0])
        y.append(data[i + time_steps, 0])
    return np.array(x), np.array(y)

# 构建LSTM模型的函数
def build_lstm_model(input_shape):
    model = Sequential()
    model.add(LSTM(units=50, return_sequences=True, input_shape=input_shape))
    model.add(LSTM(units=50))
    model.add(Dense(units=1))
    model.compile(optimizer='adam', loss='mean_squared_error')
    return model

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/news')
def news():
    return render_template('news.html')

@app.route('/stock')
def stock():
    return render_template('stock.html')

@app.route('/singlestock')
def singlestock():
    return render_template('singlestock.html')

@app.route('/aistock')
def aistock():
    return render_template('aistock.html')

@app.route('/gpt')
def gpt():
    return render_template('gpt.html')

@app.route('/oldindex')
def old():
    return render_template('oldindex.html')

@app.route('/test')
def test():
    return render_template('test.html')

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query', '')
    if not query:
        return jsonify([])

    url = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L'
    response = requests.get(url)
    data = response.json()

    filtered_data = [stock for stock in data if query in stock['公司代號'] or query in stock['公司名稱'] or query in stock['公司簡稱']]
    return jsonify(filtered_data)

@app.route('/predict', methods=['POST'])
def predict():
    stock_symbol = request.json.get('stock_symbol', '') + '.TW'
    start_date = request.json.get('start_date', '2023-01-01')
    end_date = request.json.get('end_date', '2024-05-02')
    time_steps = 10
    
    # 下载和预处理数据
    close_prices, close_prices_scaled, scaler = download_and_preprocess_data(stock_symbol, start_date, end_date)
    
    # 创建LSTM输入数据
    x, y = create_lstm_data(close_prices_scaled, time_steps)
    x = np.reshape(x, (x.shape[0], x.shape[1], 1))
    
    # 构建和训练LSTM模型
    model = build_lstm_model((x.shape[1], 1))
    model.fit(x, y, epochs=50, batch_size=32)
    
    # 预测未来1周的股票价格
    future_days = 1
    future_dates = pd.date_range(start=end_date, periods=future_days + 1)[1:]
    last_prices = close_prices[-time_steps:]
    last_prices_scaled = scaler.transform(last_prices.reshape(-1, 1))
    
    predicted_prices = []
    for _ in range(future_days):
        x_pred = np.array([last_prices_scaled[-time_steps:, 0]])
        x_pred = np.reshape(x_pred, (x_pred.shape[0], x_pred.shape[1], 1))
        predicted_price_scaled = model.predict(x_pred)
        predicted_price = scaler.inverse_transform(predicted_price_scaled)
        predicted_prices.append(predicted_price[0, 0])
        last_prices_scaled = np.append(last_prices_scaled, predicted_price_scaled)[1:].reshape(-1, 1)
    
    future_data = pd.DataFrame({
        'Date': future_dates, 
        'Predicted_Price': predicted_prices
    })
    
    return future_data.to_json(orient='records')

@app.route('/analyze', methods=['POST'])
def analyze():
    documents = request.json.get('documents', [])
    result = text_analytics_client.analyze_sentiment(documents, show_opinion_mining=True)
    docs = [doc for doc in result if not doc.is_error]

    analysis_results = []
    for idx, doc in enumerate(docs):
        analysis_results.append({
            'text': documents[idx],
            'sentiment': doc.sentiment
        })
    
    return jsonify(analysis_results)

@app.route('/gpt4v_news_analysis', methods=['POST'])
def gpt4v_news_analysis():
    news_content = request.json.get('news', '')
    if not news_content:
        return jsonify({'error': 'No news content provided'}), 400

    news_prompt = f"""
    請分析以下文章並返回受影響的股票列表，以JSON格式返回：
    1. 將結果分為正面和負面影響兩類。
    2. 在每個類別中，按影響程度（大、中、小）列出股票的股票名稱與股票代號。
    3. 在每隻股票底下寫出原因。

    文章如下：{news_content}
    """

    payload = {
        "messages": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": news_prompt
                    }
                ]
            }
        ],
        "temperature": 0.7,
        "top_p": 0.95,
        "max_tokens": 800
    }

    try:
        response = requests.post(GPT4V_ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()
        response_json = response.json()
        content = response_json['choices'][0]['message']['content']

        # 清理和解析返回的内容
        cleaned_content = re.sub(r'```json|```', '', content).strip()
        analysis_result = json.loads(cleaned_content)

        positive_impact_stocks = analysis_result.get('正面影響', {})
        negative_impact_stocks = analysis_result.get('負面影響', {})

        # 去除股票代號中的 '-TW'
        positive_impact_stocks = remove_tw_and_verify_stocks(positive_impact_stocks)
        negative_impact_stocks = remove_tw_and_verify_stocks(negative_impact_stocks)

        return jsonify({
            "positive_impact_stocks": positive_impact_stocks,
            "negative_impact_stocks": negative_impact_stocks
        })

    except requests.RequestException as e:
        return jsonify({'error': f"Failed to make the request. Error: {e}"}), 500
    except json.JSONDecodeError:
        return jsonify({"error": "The cleaned content is not in valid JSON format.", "content": cleaned_content}), 500

@app.route('/getnews', methods=['GET'])
def getnews(page=1, limit=15):
    headers = {
        'Origin': 'https://news.cnyes.com/',
        'Referer': 'https://news.cnyes.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }
    # r = requests.get(f"https://api.cnyes.com/media/api/v1/newslist/category/headline?page={page}&limit={limit}", headers=headers)
    r = requests.get(f"https://api.cnyes.com/media/api/v1/newslist/category/tw_stock_news?page={page}&limit={limit}&isCategoryHeadline=1", headers=headers)
    if r.status_code != requests.codes.ok:
        print('請求失敗', r.status_code)
        return None
    newslist_info = r.json()['items']
    return newslist_info

@app.route('/getchat', methods=['POST'])
def getchat():
    chat_content = request.json.get('chat', '')
    if not chat_content:
        return jsonify({'error': 'No news content provided'}), 400

    chat_prompt = f"""
    你現在是一個台灣投資專家負責回答任何關於股市股票等相關問題
    請先確定內容是否關於股市、股票相關、股票推薦等，如果不是請直接回應[對不起我無法回答這個問題，請詢問與股市相關問題]
    如果是先找尋最新的資訊用繁體中文回答
    問題如下：{chat_content}
    """

    payload = {
        "messages": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": chat_prompt
                    }
                ]
            }
        ],
        "temperature": 0.7,
        "top_p": 0.95,
        "max_tokens": 2000
    }


    try:
        response = requests.post(GPT4V_ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()
        response_json = response.json()
        content = response_json['choices'][0]['message']['content']

        return content

    except requests.RequestException as e:
        return jsonify({'error': f"Failed to make the request. Error: {e}"}), 500
    except json.JSONDecodeError:
        return jsonify({"error": "The cleaned content is not in valid JSON format.", "content": content}), 500
    return

@app.route('/getstockdata', methods=['GET'])
def getstockdata():
    query = request.args.get('query', '')
    if not query:
        return jsonify([])
    url = f"https://tw.stock.yahoo.com/quote/{query}.TW"

    # 設定 headers 模擬瀏覽器
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }

    # 發送 GET 請求
    response = requests.get(url, headers=headers)
    result = {
            "股價升降": "",
            "股票名稱": "",
            "股票代號": "",
            "股價": "",
            "上升": "",
            "上升百分比": "",
            "成交量": "",
            "本益比": "",
            "成交資訊": {},
            "資訊升降": {},
            "內外盤": {"內盤": None,"內盤百分比": None, "外盤": None, "外盤百分比": None},
            "委買": {"明細": [], "小計": None},
            "委賣": {"明細": [], "小計": None}
        }
    # 確認請求成功
    if response.status_code == 200:
        # 解析 HTML
        soup = BeautifulSoup(response.text, "html.parser")

        stock_name = soup.find("h1", class_="C($c-link-text) Fw(b) Fz(24px) Mend(8px)").text.strip()
        stock_num = soup.find("span", class_="C($c-icon) Fz(24px) Mend(20px)").text.strip()
        # stock_price = soup.find("span", class_="Fz(32px) Fw(b) Lh(1) Mend(16px) D(f) Ai(c) C($c-trend-up)").text.strip()
        try:
            stock_price = soup.find("span", class_="Fz(32px) Fw(b) Lh(1) Mend(16px) D(f) Ai(c) C($c-trend-up)").text.strip()
            stock_updwon = "up"
        except:
            pass   
        try:
            stock_price = soup.find("span", class_="Fz(32px) Fw(b) Lh(1) Mend(16px) C(#fff) Px(6px) Py(2px) Bdrs(4px) Bgc($c-trend-up)").text.strip()
            stock_updwon = "upfull"
        except:
            pass
        try:
            stock_price = soup.find("span", class_="Fz(32px) Fw(b) Lh(1) Mend(16px) D(f) Ai(c)").text.strip()
            stock_updwon = "0"
        except:
            pass 
        try:
            stock_price = soup.find("span", class_="Fz(32px) Fw(b) Lh(1) Mend(16px) D(f) Ai(c) C($c-trend-down)").text.strip()
            stock_updwon = "downfull"
        except:
            pass 
        try:
            stock_price = soup.find("span", class_="Fz(32px) Fw(b) Lh(1) Mend(16px) C(#fff) Px(6px) Py(2px) Bdrs(4px) Bgc($c-trend-down)").text.strip()
            stock_updwon = "down"
        except:
            pass     
        #stock_percent = soup.find("span", class_="Jc(fe) Fz(20px) Lh(1.2) Fw(b) D(f) Ai(c) C($c-trend-up)").text.strip()
        try:
            stock_percent = soup.find("span", class_="Jc(fe) Fz(20px) Lh(1.2) Fw(b) D(f) Ai(c) C($c-trend-up)").text.strip()
        except:
            pass
        try:
            stock_percent = soup.find("span", class_="Jc(fe) Fz(20px) Lh(1.2) Fw(b) D(f) Ai(c)").text.strip()
        except:
            pass
        try:
            stock_percent = soup.find("span", class_="Jc(fe) Fz(20px) Lh(1.2) Fw(b) D(f) Ai(c) C($c-trend-down)").text.strip()
        except:
            pass
        # stock_up = soup.find("span", class_="Fz(20px) Fw(b) Lh(1.2) Mend(4px) D(f) Ai(c) C($c-trend-up)").text.strip()
        try:
            stock_up = soup.find("span", class_="Fz(20px) Fw(b) Lh(1.2) Mend(4px) D(f) Ai(c) C($c-trend-up)").text.strip()
        except:
            pass
        try:
            stock_up = soup.find("span", class_="Fz(20px) Fw(b) Lh(1.2) Mend(4px) D(f) Ai(c)").text.strip()
        except:
            pass
        try:
            stock_up = soup.find("span", class_="Fz(20px) Fw(b) Lh(1.2) Mend(4px) D(f) Ai(c) C($c-trend-down)").text.strip()
        except:
            pass
        stock_time = soup.find("span", class_="C(#6e7780) Fz(12px) Fw(b)").text.strip()
        stock_get1 = soup.find("span", class_="Fz(16px) C($c-link-text) Mb(4px)").text.strip()
        stock_get2 = soup.find_all("span", class_="Fz(16px) C($c-link-text) Mb(4px)")[1].text.strip()

        result["股價升降"] = stock_updwon
        result["股票名稱"] = stock_name
        result["股票代號"] = stock_num
        result["股價"] = stock_price
        result["上升"] = stock_up
        result["上升百分比"] = stock_percent
        result["更新時間"] = stock_time
        result["成交量"] = stock_get1
        result["本益比"] = stock_get2

    # 提取成交資訊
        try:
            price_detail = soup.select("ul .price-detail-item")
            for item in price_detail:
                label = item.find("span", class_="C(#232a31)").text.strip()
                value = item.find("span", class_="Fw(600)").text.strip()
                #itemvalue = value = item.find("span", class_="Fw(600)")
                result["成交資訊"][label] = value
                class_list = item.find("span", class_="Fw(600)").get('class')
                if 'C($c-trend-down)' in class_list:
                    result["資訊升降"][label] = "green"
                elif 'C($c-trend-up)' in class_list:
                    result["資訊升降"][label] = "red"
                else:
                    result["資訊升降"][label] = "gray"
        except Exception as e:
            print(f"無法獲取成交資訊: {e}")

        # 提取內盤與外盤資訊
        try:
            inner_outer_div = soup.find("div", class_="Mt(24px)")
            if inner_outer_div:
                # inner = inner_outer_div.find_all("span", class_="C($c-trend-down)")[0].text.strip()
                # inner_percent = inner_outer_div.find_all("span", class_="C($c-trend-down)")[1].text.strip()
                # outer = inner_outer_div.find_all("span", class_="C($c-trend-up)")[0].text.strip()
                # outer_percent = inner_outer_div.find_all("span", class_="C($c-trend-up)")[1].text.strip()
                # result["內外盤"]["內盤"] = f"{inner}({inner_percent})"
                # result["內外盤"]["外盤"] = f"{outer}({outer_percent})"
                inner = inner_outer_div.find_all("span", class_="C($c-trend-down)")[0].text.strip()
                inner_num = re.sub(r"\(.*?\)", "", inner).strip()
                inner_percent = re.search(r"\((.*?)\)", inner).group(1)
                outer = inner_outer_div.find_all("span", class_="C($c-trend-up)")[0].text.strip()
                outer_num = re.sub(r"\(.*?\)", "", outer).strip()
                outer_percent = re.search(r"\((.*?)\)", outer).group(1)
                result["內外盤"]["內盤"] = f"{inner_num}"
                result["內外盤"]["內盤百分比"] = f"{inner_percent}"
                result["內外盤"]["外盤"] = f"{outer_num}"
                result["內外盤"]["外盤百分比"] = f"{outer_percent}"
        except Exception as e:
            print(f"無法獲取內盤與外盤: {e}")

        # 提取委買資訊
        try:
            buy_section = soup.find_all("div", class_="W(50%) Bxz(bb)")[0]
            if buy_section:
                buy_prices = buy_section.find_all("span", class_="Fw(n) Fz(16px)--mobile Fz(14px) D(f) Ai(c)")
                buy_quantities = buy_section.find_all("div", class_="Pos(r) D(f) Ai(c) H(28px) C(#232a31) Fz(16px)--mobile Fz(14px) Pstart(0px) Pend(0px) Mend(4px) Jc(fs)")
                for price, qty in zip(buy_prices, buy_quantities):
                    result["委買"]["明細"].append({
                        "價格": price.text.strip(),
                        "數量": qty.text.strip()
                    })
                buy_total = buy_section.find_all("div", class_="D(f) Jc(sb) Ai(c) Mstart(0) Mend(16px) C(#232a31) Fz(16px)--mobile Fz(14px) Pt(4px) Bdtw(1px) Bdts(s) Bdtc($bd-primary-divider)")
                if buy_total:
                    result["委買"]["小計"] = re.sub(r"[^\d,]", "", buy_total[0].text.strip())
        except Exception as e:
            print(f"無法獲取委買資訊: {e}")

        # 提取委賣資訊
        try:
            sell_section = soup.find_all("div", class_="W(50%) Bxz(bb)")[1]
            if sell_section:
                sell_prices = sell_section.find_all("span", class_="Fw(n) Fz(16px)--mobile Fz(14px) D(f) Ai(c)")
                sell_quantities = sell_section.find_all("div", class_="Pos(r) D(f) Ai(c) H(28px) C(#232a31) Fz(16px)--mobile Fz(14px) Pstart(0px) Pend(0px) Mstart(4px) Jc(fe)")
                for price, qty in zip(sell_prices, sell_quantities):
                    result["委賣"]["明細"].append({
                        "價格": price.text.strip(),
                        "數量": qty.text.strip()
                    })
                sell_total = sell_section.find_all("div", class_="D(f) Jc(sb) Ai(c) C(#232a31) Fz(16px)--mobile Fz(14px) Pt(4px) Bdtw(1px) Bdts(s) Bdtc($bd-primary-divider) Mstart(16px) Mend(0)")
                if sell_total:
                    result["委賣"]["小計"] = re.sub(r"[^\d,]", "", sell_total[0].text.strip())
        except Exception as e:
            print(f"無法獲取委賣資訊: {e}")

    return result

@app.route('/stock_data', methods=['GET'])
def get_stock_data():
    symbol = request.args.get('symbol', '2330.TW')
    period = request.args.get('period', '6mo')
    interval = request.args.get('interval', '1d')  
    # interval將由前端傳入，例如 '5m','30m','1d','1wk','1mo'等

    df = yf.download(symbol, period=period, interval=interval)
    df.reset_index(inplace=True)

    # 計算MA
    df['MA5'] = df['Close'].rolling(5).mean()
    df['MA20'] = df['Close'].rolling(20).mean()
    df['MA60'] = df['Close'].rolling(60).mean()
    
    # MACD
    macd = df.ta.macd(close='Close', fast=12, slow=26, signal=9)
    df['DIF'] = macd['MACD_12_26_9']
    df['DEA'] = macd['MACDs_12_26_9']
    df['MACD_Hist'] = macd['MACDh_12_26_9']
    
    # RSI(14)
    df['RSI'] = df.ta.rsi(length=14)

    # KDJ
    kdj = df.ta.stoch(high='High', low='Low', close='Close', k=9, d=3)
    df['K'] = kdj['STOCHk_9_3_3']
    df['D'] = kdj['STOCHd_9_3_3']
    df['J'] = 3 * df['K'] - 2 * df['D']

    # 威廉指標%R(14)
    df['WR'] = df.ta.willr(length=14)

    # DMI(14)
    dmi = df.ta.adx(length=14)
    df['ADX'] = dmi['ADX_14']
    df['PDI'] = dmi['DMP_14']
    df['MDI'] = dmi['DMN_14']

    # BIAS (以MA20為基準)
    df['BIAS'] = ((df['Close'] - df['MA20']) / df['MA20']) * 100

    # CDP (根據前一日數據)
    df['PrevHigh'] = df['High'].shift(1)
    df['PrevLow'] = df['Low'].shift(1)
    df['PrevClose'] = df['Close'].shift(1)
    df['CDP'] = (df['PrevHigh'] + df['PrevLow'] + 2*df['PrevClose'])/4
    df.drop(columns=['PrevHigh','PrevLow','PrevClose'], inplace=True)

    # 移除NaN
    df.dropna(inplace=True)

    df['Date'] = df['Date'].astype(str)
    data = df.to_dict(orient='records')
    return jsonify(data)

@app.route('/market_data')
def market_data():
    df = yf.download('^TWII', period='1d', interval='1m')
    df.reset_index(inplace=True)
    df['timestamp'] = df['Datetime'].astype(str)
    data = []
    for _, row in df.iterrows():
        data.append({
            "timestamp": row['timestamp'],
            "open": float(row['Open']),
            "high": float(row['High']),
            "low": float(row['Low']),
            "close": float(row['Close']),
            "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0
        })
    return jsonify(data)


def remove_tw_and_verify_stocks(stock_data):
    # 从 TWSE API 获取所有上市公司信息
    try:
        response = requests.get('https://openapi.twse.com.tw/v1/opendata/t187ap03_L')
        response.raise_for_status()
        twse_data = response.json()
    except requests.RequestException as e:
        print(f"Failed to fetch TWSE data. Error: {e}")
        return {}  # 返回空字典，表示无法验证

    # 解析TWSE数据，构建合法股票代号和公司名称的集合
    valid_stock_codes = {stock['公司代號'] for stock in twse_data}
    valid_company_names = {stock['公司簡稱'] for stock in twse_data}

    # 新的存储有效股票的字典
    verified_stocks = {}

    for impact_level, stocks in stock_data.items():
        verified_stocks[impact_level] = []
        for stock in stocks:
            # 去除股票代号中的 '-TW'
            stock_code = stock["股票代號"].replace('-TW', '')
            stock_name = stock["股票名稱"]

            # 检查是否在合法股票代码或公司名称列表中
            if stock_code in valid_stock_codes or stock_name in valid_company_names:
                # 添加到验证通过的股票列表中
                verified_stocks[impact_level].append(stock)

    return verified_stocks



if __name__ == '__main__':
    app.run(debug=True)
