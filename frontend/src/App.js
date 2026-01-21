import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import ChartComponent from './components/ChartComponent';
import { 
  LayoutDashboard, Database, Search, X, Send, Save, 
  Trash2, RefreshCw, TrendingUp, TrendingDown, 
  Filter, Bell, Zap, MoreHorizontal, Bug, Star // Imported Star and Bug
} from 'lucide-react';

const API_URL = "http://127.0.0.1:5000/api";

function App() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('market'); 
  const [marketData, setMarketData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [savedData, setSavedData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState('all'); // 'all', 'gainers', 'losers'
  
  // UI States
  const [selectedCoins, setSelectedCoins] = useState([]); 
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // New: Spider Status State
  const [spiderStatus, setSpiderStatus] = useState("System Ready");
  
  // Detail View States
  const [chartInterval, setChartInterval] = useState("1h");
  const [chartData, setChartData] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (activeTab === 'market') {
      fetchMarket();
      const interval = setInterval(fetchMarket, 5000);
      return () => clearInterval(interval);
    } else {
      fetchWatchlist();
    }
  }, [activeTab]);

  // --- FILTERING LOGIC ---
  useEffect(() => {
    const sourceData = activeTab === 'market' ? marketData : savedData;
    let result = sourceData;

    // 1. Search Filter
    const lowerTerm = searchTerm.toLowerCase();
    result = result.filter(coin => 
      coin.symbol.toLowerCase().includes(lowerTerm)
    );

    // 2. Category Filter (Gainers/Losers)
    if (filterType === 'gainers') {
      result = result.filter(coin => coin.change > 0);
    } else if (filterType === 'losers') {
      result = result.filter(coin => coin.change < 0);
    }

    setFilteredData(result);
  }, [searchTerm, marketData, savedData, activeTab, filterType]);

  // --- HELPER: SHOW NOTIFICATION ---
  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- HELPER: FORMAT SYMBOL (REMOVE USDT) ---
  const formatSymbol = (symbol) => symbol.replace('USDT', '');

  // --- API ACTIONS ---
  const fetchMarket = async () => {
    try {
      const res = await axios.get(`${API_URL}/market`);
      setMarketData(res.data);
    } catch (err) { console.error("API Error", err); }
  };

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get(`${API_URL}/watchlist`);
      setSavedData(res.data);
      if (activeTab === 'watchlist') setFilteredData(res.data);
    } catch (err) { console.error("API Error", err); }
  };

  // NEW: Run Spider Function
  const runSpider = async () => {
    setSpiderStatus("🕷 Spider Running...");
    try {
      const res = await axios.post(`${API_URL}/run-spider`);
      if (res.data.status === 'success') {
        setSpiderStatus("✅ Data Updated!");
        fetchMarket(); // Refresh table immediately
        showToast("Spider Crawl Completed!", "success");
        setTimeout(() => setSpiderStatus("System Ready"), 3000);
      }
    } catch (err) {
      console.error(err);
      setSpiderStatus("❌ Connection Failed");
      showToast("Spider Failed to Run", "error");
    }
  };

  const saveSelectedToDB = async () => {
    const coinsToSave = marketData.filter(coin => selectedCoins.includes(coin.symbol));
    if (coinsToSave.length === 0) return showToast("Select coins via Star icon first!", "error");

    try {
      const res = await axios.post(`${API_URL}/watchlist`, { coins: coinsToSave });
      showToast(`${selectedCoins.length} Assets Secured to DB`, "success");
      setSelectedCoins([]); 
    } catch (err) { showToast("Database Connection Failed", "error"); }
  };

  const deleteFromDB = async (symbol) => {
    try {
      await axios.post(`${API_URL}/watchlist/delete`, { symbol });
      showToast(`${formatSymbol(symbol)} Removed`, "neutral");
      fetchWatchlist();
    } catch (err) { console.error(err); }
  };

  // --- SELECTION LOGIC (Using Stars now) ---
  const toggleSelect = (e, symbol) => {
    e.stopPropagation(); // Prevent row click event
    if (selectedCoins.includes(symbol)) {
        setSelectedCoins(selectedCoins.filter(s => s !== symbol));
    } else {
        setSelectedCoins([...selectedCoins, symbol]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCoins.length === filteredData.length) setSelectedCoins([]); 
    else setSelectedCoins(filteredData.map(c => c.symbol)); 
  };

  // --- DETAIL & AI LOGIC ---
  const openCoinDetail = async (symbol, interval = "1h") => {
    if (selectedCoin !== symbol) {
      setLoading(true);
      setSelectedCoin(symbol);
      setChatMessages([{ sender: "ai", text: `🔄 Analyzing ${formatSymbol(symbol)} market structure...` }]);
    }
    setChartInterval(interval);

    try {
      const res = await axios.get(`${API_URL}/analyze/${symbol}?interval=${interval}`);
      setChartData(res.data.chart);
      
      if (selectedCoin !== symbol) {
        const ai = res.data.ai_analysis;
        // Removed emoji reference here
        setChatMessages([{ sender: "ai", text: `📊 **Market Intelligence**\nSignal: ${ai.signal}\nRSI: ${ai.rsi}` }]);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    const newMsg = { sender: "user", text: userInput };
    setChatMessages(prev => [...prev, newMsg]);
    setUserInput("");

    try {
      const res = await axios.post(`${API_URL}/chat`, { symbol: selectedCoin, message: userInput });
      setChatMessages(prev => [...prev, { sender: "ai", text: res.data.reply }]);
    } catch (err) { showToast("AI Engine Offline", "error"); }
  };

  const getIconUrl = (symbol) => `https://assets.coincap.io/assets/icons/${symbol.replace("USDT", "").toLowerCase()}@2x.png`;

  return (
    <div className="app-container">
      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          <Bell size={16} /> {notification.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Zap size={24} fill="#FCD535" color="#FCD535"/></div>
          <div>
            <h2>NEURO<span className="highlight">TRADE</span></h2>
          </div>
        </div>

        {/* NEW: SPIDER BUTTON SECTION */}
        <div className="spider-section">
          <p className="section-label">DATA PIPELINE</p>
          <button onClick={runSpider} className="spider-btn">
            <Bug size={16}/> Run Spider
          </button>
          <small className="status-text">{spiderStatus}</small>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>
            <LayoutDashboard size={20}/> <span>Market Overview</span>
          </button>
          <button className={`nav-item ${activeTab === 'watchlist' ? 'active' : ''}`} onClick={() => setActiveTab('watchlist')}>
            <Database size={20}/> <span>Smart Watchlist</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className="dot online"></span> System Operational
          </div>
          <div className="user-profile">
            <div className="avatar">M</div>
            <div className="user-info">
              <span>Admin User</span>
              <small>Premium Access</small>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* TOP HEADER */}
        <header className="top-header">
          <div className="header-left">
            <h1>{activeTab === 'market' ? 'Global Market' : 'Your Portfolio'}</h1>
            <p>Real-time AI Analysis & Data Streams</p>
          </div>
          <div className="header-right">
            <div className="search-bar">
              <Search size={18} />
              <input 
                placeholder="Search Asset..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* ACTION BUTTONS */}
            <button className="icon-btn" onClick={fetchMarket} title="Force Refresh"><RefreshCw size={20}/></button>
            {activeTab === 'market' && selectedCoins.length > 0 && (
              <button className="primary-btn pulse" onClick={saveSelectedToDB}>
                <Save size={18}/> SAVE SELECTED ({selectedCoins.length})
              </button>
            )}
          </div>
        </header>

        {/* FILTERS BAR */}
        <div className="filters-bar">
          <div className="filter-group">
            <button className={`filter-chip ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All Assets</button>
            <button className={`filter-chip ${filterType === 'gainers' ? 'active' : ''}`} onClick={() => setFilterType('gainers')}>
              <TrendingUp size={14}/> Top Gainers
            </button>
            <button className={`filter-chip ${filterType === 'losers' ? 'active' : ''}`} onClick={() => setFilterType('losers')}>
              <TrendingDown size={14}/> Top Losers
            </button>
          </div>
          <div className="stats-display">
            <span>Listed: <strong>{marketData.length}</strong></span>
            <span className="divider">|</span>
            <span>Showing: <strong>{filteredData.length}</strong></span>
          </div>
        </div>

        {/* DATA GRID */}
        <div className="data-grid-container">
          <table className="pro-table">
            <thead>
              <tr>
                {/* Changed Checkbox Header to Fav */}
                {activeTab === 'market' && (
                  <th width="50">Fav</th>
                )}
                <th>Asset Name</th>
                <th>Price (USDT)</th>
                <th>24h Change</th>
                <th>RSI Strength</th> {/* Only RSI, no Mood */}
                <th>Volume</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((coin) => {
                const isSelected = selectedCoins.includes(coin.symbol);
                return (
                  <tr key={coin.symbol} className={isSelected ? 'row-selected' : ''} onClick={() => openCoinDetail(coin.symbol)}>
                    
                    {/* Star Icon for Selection */}
                    {activeTab === 'market' && (
                      <td onClick={(e) => toggleSelect(e, coin.symbol)} style={{cursor: 'pointer', textAlign:'center'}}>
                         <Star 
                           size={18} 
                           fill={isSelected ? "#FCD535" : "none"} 
                           color={isSelected ? "#FCD535" : "#848E9C"}
                           className="star-icon"
                         />
                      </td>
                    )}

                    <td>
                      <div className="asset-info">
                        <img src={getIconUrl(coin.symbol)} onError={(e) => {e.target.style.display='none'}} alt="" />
                        <div>
                          <span className="symbol">{formatSymbol(coin.symbol)}</span>
                          <span className="pair">/USDT</span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="price-cell">${coin.price.toFixed(2)}</td>
                    
                    <td>
                      <div className={`change-badge ${coin.change >= 0 ? 'up' : 'down'}`}>
                        {coin.change >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                        {Math.abs(coin.change).toFixed(2)}%
                      </div>
                    </td>

                    {/* RSI Bar Visualization */}
                    <td>
                        <div className="rsi-wrapper">
                            <div 
                                className="rsi-fill"
                                style={{
                                    width: `${coin.rsi || 50}%`,
                                    backgroundColor: (coin.rsi || 50) < 30 ? '#0ECB81' : (coin.rsi || 50) > 70 ? '#F6465D' : '#FCD535'
                                }}
                            ></div>
                        </div>
                        <span className="rsi-val">{coin.rsi || 50}</span>
                    </td>
                    
                    <td className="dim-text">{(coin.volume / 1000000).toFixed(2)}M</td>
                    
                    <td>
                      {activeTab === 'watchlist' ? (
                        <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); deleteFromDB(coin.symbol); }}>
                          <Trash2 size={16}/> Remove
                        </button>
                      ) : (
                        <button className="action-btn analyze">
                            Analyze <MoreHorizontal size={14}/>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredData.length === 0 && <div className="empty-state"><Filter size={48}/><p>No assets match your criteria.</p></div>}
        </div>
      </main>

      {/* PRO MODAL OVERLAY */}
      {selectedCoin && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            {/* CHART SECTION */}
            <div className="panel-left">
              <div className="panel-header">
                <div className="coin-title">
                  <img src={getIconUrl(selectedCoin)} alt=""/>
                  <h2>{formatSymbol(selectedCoin)}<small>/USDT</small></h2>
                </div>
                <div className="timeframe-buttons">
                  {['15m', '1h', '4h', '1d'].map(tf => (
                    <button key={tf} className={chartInterval === tf ? 'active' : ''} onClick={() => openCoinDetail(selectedCoin, tf)}>{tf.toUpperCase()}</button>
                  ))}
                </div>
                <button className="close-icon" onClick={() => setSelectedCoin(null)}><X size={24}/></button>
              </div>
              <div className="chart-wrapper">
                {loading ? <div className="loader-spinner"></div> : <ChartComponent data={chartData} symbol={selectedCoin} />}
              </div>
            </div>

            {/* AI CHAT SECTION */}
            <div className="panel-right">
              <div className="ai-header">
                <Zap size={18} className="ai-icon"/>
                <span>NeuroTrade AI Engine</span>
              </div>
              <div className="chat-area">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`message-row ${msg.sender}`}>
                    <div className="message-bubble">{msg.text}</div>
                  </div>
                ))}
              </div>
              <div className="input-area">
                <input 
                  value={userInput} 
                  onChange={(e) => setUserInput(e.target.value)} 
                  placeholder="Ask for price prediction..." 
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage}><Send size={18}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;