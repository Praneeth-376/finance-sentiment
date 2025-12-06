import React from "react";

export default function BacktestAnalytics({ metrics, darkMode }) {
  if (!metrics) return null;

  // Helper function to format numbers with colors
  const formatNumber = (value, type = 'default') => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (type === 'percentage') {
      const color = numValue > 0 ? 'text-green-500' : numValue < 0 ? 'text-red-500' : 'text-gray-500';
      return <span className={color}>{numValue > 0 ? '+' : ''}{numValue.toFixed(2)}%</span>;
    }
    
    if (type === 'profitFactor') {
      const color = numValue > 1.5 ? 'text-green-500' : numValue > 1 ? 'text-yellow-500' : 'text-red-500';
      return <span className={color}>{numValue.toFixed(2)}</span>;
    }
    
    if (type === 'sharpe') {
      const color = numValue > 1 ? 'text-green-500' : numValue > 0.5 ? 'text-yellow-500' : 'text-red-500';
      return <span className={color}>{numValue.toFixed(2)}</span>;
    }
    
    if (type === 'winRate') {
      const color = numValue > 60 ? 'text-green-500' : numValue > 40 ? 'text-yellow-500' : 'text-red-500';
      return <span className={color}>{numValue.toFixed(2)}%</span>;
    }
    
    if (type === 'drawdown') {
      const color = numValue < -10 ? 'text-red-500' : numValue < -5 ? 'text-yellow-500' : 'text-green-500';
      return <span className={color}>{numValue.toFixed(2)}%</span>;
    }
    
    return <span>{value}</span>;
  };

  return (
    <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-2xl shadow-md border`}>
      
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          📊 Backtest Analytics
        </h3>
        <div className={`text-xs px-3 py-1 rounded-full ${
          darkMode ? 'bg-slate-700' : 'bg-slate-100'
        }`}>
          {metrics.totalTrades || 0} trades
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* Performance Metrics */}
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
            Total Return
          </div>
          <div className={`text-xl font-bold`}>
            {formatNumber(metrics.totalReturn, 'percentage')}
          </div>
        </div>

        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
            Win Rate
          </div>
          <div className="text-xl font-bold">
            {formatNumber(metrics.winRate, 'winRate')}
          </div>
        </div>

        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
            Avg Return / Trade
          </div>
          <div className={`text-xl font-bold`}>
            {formatNumber(metrics.avgReturn, 'percentage')}
          </div>
        </div>

        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
            Max Drawdown
          </div>
          <div className="text-xl font-bold">
            {formatNumber(metrics.maxDrawdown, 'drawdown')}
          </div>
        </div>

        {/* Risk Metrics */}
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
            Profit Factor
          </div>
          <div className="text-xl font-bold">
            {formatNumber(metrics.profitFactor, 'profitFactor')}
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {metrics.profitFactor > 1.5 ? 'Excellent' : 
             metrics.profitFactor > 1 ? 'Good' : 'Poor'}
          </div>
        </div>

        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
            Sharpe Ratio
          </div>
          <div className="text-xl font-bold">
            {formatNumber(metrics.sharpeRatio, 'sharpe')}
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {metrics.sharpeRatio > 1 ? 'Good' : 
             metrics.sharpeRatio > 0.5 ? 'Average' : 'Poor'}
          </div>
        </div>

        {/* Trade Stats */}
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
            Buy Signals
          </div>
          <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {metrics.buyCount || 0}
          </div>
        </div>

        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
            Sell Signals
          </div>
          <div className={`text-xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
            {metrics.sellCount || 0}
          </div>
        </div>

      </div>

      {/* Equity Summary */}
      {(metrics.startingEquity || metrics.finalEquity) && (
        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Starting Equity
              </div>
              <div className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                ${(metrics.startingEquity || 10000).toLocaleString()}
              </div>
            </div>
            <div className="text-slate-400">→</div>
            <div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Final Equity
              </div>
              <div className={`text-sm font-bold ${
                metrics.totalProfit > 0 ? 'text-green-500' : 
                metrics.totalProfit < 0 ? 'text-red-500' : 
                darkMode ? 'text-slate-300' : 'text-slate-900'
              }`}>
                ${(metrics.finalEquity || 10000).toLocaleString()}
              </div>
            </div>
            <div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Profit/Loss
              </div>
              <div className={`text-sm font-bold ${
                metrics.totalProfit > 0 ? 'text-green-500' : 
                metrics.totalProfit < 0 ? 'text-red-500' : 
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                ${(metrics.totalProfit || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={`mt-4 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Average</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
}