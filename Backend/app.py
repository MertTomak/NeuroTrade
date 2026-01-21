from flask import Flask, jsonify, request
import spider_runner
from flask_cors import CORS
from data_fetcher import BinanceFetcher
from ai_engine import AIEngine
from pymongo import MongoClient
import datetime
import os
import subprocess  # REQUIRED: To run Scrapy spider
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

fetcher = BinanceFetcher()
ai = AIEngine()

# --- MONGODB CONNECTION ---
MONGO_URI = os.getenv("MONGO_URI")

chats_collection = None
watchlist_collection = None

try:
    if MONGO_URI:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client["NeuroTradeDB"] 
        chats_collection = db["chat_history"]
        watchlist_collection = db["watchlist"]
        print(">>> MongoDB Connected Successfully! (Secure Mode) ✅")
    else:
        print(">>> WARNING: MONGO_URI not found in .env file! ⚠️")

except Exception as e:
    print(f">>> MongoDB Connection Error: {e}")


# --- HELPER FUNCTIONS ---

def calculate_rsi_mock(price_change):
    """
    Calculates a mock RSI value (0-100) based on 24h price change
    for visualization purposes on the frontend.
    """
    base_rsi = 50 + (float(price_change) * 2.5)
    return max(0, min(100, int(base_rsi)))


# --- API ENDPOINTS ---

@app.route('/api/market', methods=['GET'])
def get_market():
    # Fetch top 50 tokens from Binance
    raw_data = fetcher.fetch_top_tokens(limit=50)
    processed = []
    
    for item in raw_data:
        try:
            price_change = float(item['priceChangePercent'])
            
            # Calculate RSI only (No Mood/Emoji)
            rsi_val = calculate_rsi_mock(price_change)

            processed.append({
                "symbol": item['symbol'],
                "price": float(item['lastPrice']),
                "change": price_change,
                "volume": float(item['quoteVolume']),
                "rsi": rsi_val  # Sending RSI for the bar visualization
            })
        except Exception as e:
            continue
            
    return jsonify(processed)

@app.route('/api/analyze/<symbol>', methods=['GET'])
def analyze_coin(symbol):
    interval = request.args.get('interval', '1h')
    data = fetcher.fetch_klines(symbol, interval)
    analysis = ai.analyze_token(symbol, data['closes'])
    
    return jsonify({
        "chart": data['chart_data'],
        "ai_analysis": analysis
    })

@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    body = request.json
    symbol = body.get('symbol')
    user_msg = body.get('message')
    
    data = fetcher.fetch_klines(symbol, interval="1h")
    analysis = ai.analyze_token(symbol, data['closes'])
    reply = ai.chat_response(symbol, analysis, user_msg)
    
    # Log conversation to MongoDB
    if chats_collection is not None:
        chats_collection.insert_one({
            "symbol": symbol,
            "user_msg": user_msg,
            "ai_reply": reply,
            "timestamp": datetime.datetime.now()
        })
    
    return jsonify({"reply": reply})


# --- NEW ENDPOINT: SPIDER TRIGGER ---

@app.route('/api/run-spider', methods=['POST'])
def run_spider():
    """
    Endpoint to trigger the Scrapy Spider as a subprocess.
    """
    try:
        # Executes 'scrapy crawl coin_spider' in the system terminal
        subprocess.run(["scrapy", "crawl", "coin_spider"], check=True)
        return jsonify({"status": "success", "message": "Spider executed successfully!"})
    except Exception as e:
        print(f"Spider Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# --- WATCHLIST ENDPOINTS ---

@app.route('/api/watchlist', methods=['POST'])
def save_watchlist():
    if watchlist_collection is None:
        return jsonify({"status": "error", "message": "Database not connected"}), 500

    selected_coins = request.json.get('coins', [])
    
    for coin in selected_coins:
        watchlist_collection.update_one(
            {"symbol": coin['symbol']}, 
            {"$set": coin}, 
            upsert=True
        )
        
    return jsonify({"status": "success", "message": f"{len(selected_coins)} coins saved to Watchlist!"})

@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    if watchlist_collection is None:
        return jsonify([])
    
    saved_coins = list(watchlist_collection.find({}, {"_id": 0}))
    return jsonify(saved_coins)

@app.route('/api/watchlist/delete', methods=['POST'])
def delete_from_watchlist():
    if watchlist_collection is None:
        return jsonify({"status": "error"})
    
    symbol = request.json.get('symbol')
    watchlist_collection.delete_one({"symbol": symbol})
    return jsonify({"status": "deleted"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)