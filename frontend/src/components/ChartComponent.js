import React from 'react';
import Chart from 'react-apexcharts';

const ChartComponent = ({ data, symbol }) => {
  // Convert incoming data to ApexCharts format
  const series = [{
    data: data.map(item => ({
      x: new Date(item.time),
      y: [item.open, item.high, item.low, item.close]
    }))
  }];

  // Chart Options (Dark Mode & Professional Look)
  const options = {
    chart: {
      type: 'candlestick',
      height: 350,
      background: 'transparent', // Transparent background
      toolbar: { show: false },  // Hide top toolbar
      animations: { enabled: false } // Disable animation for performance
    },
    title: {
      text: `${symbol} / USDT`,
      align: 'left',
      style: { color: '#eaecef', fontSize: '18px', fontWeight: 'bold' }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#848e9c' } },
      axisBorder: { show: false },
      axisTicks: { color: '#2b3139' },
      tooltip: { enabled: false }
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: { 
        style: { colors: '#848e9c' },
        formatter: (val) => val.toFixed(2) // Format price to 2 decimals
      },
      grid: { borderColor: '#2b3139' }
    },
    grid: {
      borderColor: '#2b3139',
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },   
      yaxis: { lines: { show: true } },
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#0ecb81',   // Green for up
          downward: '#f6465d'  // Red for down
        },
        wick: { useFillColor: true }
      }
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px' },
      x: { format: 'dd MMM HH:mm' }
    }
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Chart options={options} series={series} type="candlestick" height="100%" />
    </div>
  );
};

export default ChartComponent;