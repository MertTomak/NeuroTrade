import pandas as pd
import ta
import random

class AIEngine:
    def analyze_token(self, symbol, prices):
        # Check sufficient data
        if not prices or len(prices) < 20:
            return {"signal": "NEUTRAL", "reason": "Insufficient Data", "rsi": 0}

        df = pd.DataFrame(prices, columns=['close'])

        # 1. RSI Indicator
        rsi_ind = ta.momentum.RSIIndicator(close=df['close'], window=14)
        df['rsi'] = rsi_ind.rsi()
        current_rsi = df['rsi'].iloc[-1]

        # 2. SMA Indicator
        sma_ind = ta.trend.SMAIndicator(close=df['close'], window=20)
        df['sma'] = sma_ind.sma_indicator()
        sma_val = df['sma'].iloc[-1]
        
        current_price = prices[-1]

        # Decision Logic
        signal = "HOLD"
        reason = "Market is undecided."
        
        if current_rsi < 30:
            signal = "STRONG BUY"
            reason = f"RSI ({round(current_rsi, 1)}) is oversold. Bounce expected."
        elif current_rsi > 70:
            signal = "STRONG SELL"
            reason = f"RSI ({round(current_rsi, 1)}) is overbought. Correction expected."
        elif current_price > sma_val and current_rsi > 50:
            signal = "BUY"
            reason = "Price above average, momentum is positive."
        elif current_price < sma_val and current_rsi < 50:
            signal = "SELL"
            reason = "Price below average, momentum is negative."

        return {
            "symbol": symbol,
            "current_price": current_price,
            "rsi": round(current_rsi, 2),
            "sma": round(sma_val, 2),
            "signal": signal,
            "reason": reason
        }

    def chat_response(self, symbol, analysis, user_msg):
        msg = user_msg.lower()
        signal = analysis.get('signal')
        rsi = analysis.get('rsi')
        reason = analysis.get('reason')

        # Case 1: Buy/Sell questions
        if any(x in msg for x in ["buy", "sell", "action", "recommend", "trade", "al", "sat"]):
            return (
                f"🤖 **Trade Signal:**\n"
                f"Current Signal: **{signal}**\n\n"
                f"👉 **Reason:** {reason}\n"
                f"⚠️ *Not financial advice. Based on technical data only.*"
            )

        # Case 2: Indicator questions
        elif any(x in msg for x in ["indicator", "rsi", "sma", "technical"]):
            return (
                f"📊 **Technical Indicators:**\n"
                f"• **RSI (14):** {rsi} (Momentum)\n"
                f"• **SMA (20):** ${analysis.get('sma')} (Trend Line)\n\n"
                f"Used to determine trend direction."
            )

        # Case 3: General status
        else:
            return (
                f"🤖 **{symbol} Analysis:**\n"
                f"Signal: {signal}\n"
                f"RSI: {rsi}\n"
                f"View: {reason}\n\n"
                f"Ask me 'Should I buy?' or 'What indicators are used?'"
            )