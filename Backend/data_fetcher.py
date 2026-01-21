import requests

class BinanceFetcher:
    def __init__(self):
        self.base_url = "https://api.binance.com/api/v3"

    def fetch_top_tokens(self, limit=20):
        """Fetches top tokens by volume for the dashboard."""
        try:
            url = f"{self.base_url}/ticker/24hr"
            response = requests.get(url, timeout=10)
            data = response.json()
            
            # Filter USDT pairs
            usdt_pairs = [x for x in data if x['symbol'].endswith('USDT')]
            # Sort by Volume
            sorted_pairs = sorted(usdt_pairs, key=lambda x: float(x['quoteVolume']), reverse=True)
            
            return sorted_pairs[:limit]
        except Exception as e:
            print(f"Fetch Error: {e}")
            return []

    def fetch_klines(self, symbol, interval="1h", limit=50):
        """
        Fetches candlestick data for charts and AI analysis.
        """
        try:
            url = f"{self.base_url}/klines"
            params = {"symbol": symbol, "interval": interval, "limit": limit}
            res = requests.get(url, params=params, timeout=10).json()
            
            # 1. Extract closing prices for AI
            closes = [float(x[4]) for x in res]
            
            # 2. Format data for Frontend Chart
            chart_data = []
            for x in res:
                chart_data.append({
                    "time": x[0],      # Timestamp
                    "open": float(x[1]),
                    "high": float(x[2]),
                    "low": float(x[3]),
                    "close": float(x[4])
                })
                
            return {"closes": closes, "chart_data": chart_data}
        
        except Exception as e:
            print(f"Kline Error ({symbol}): {e}")
            return {"closes": [], "chart_data": []}