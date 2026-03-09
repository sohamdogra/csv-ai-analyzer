# 📊 CSV AI Analyzer

An AI-powered CSV data analysis tool built with **React** and the **Anthropic Claude API**. Upload any CSV file and get instant AI-generated insights, visualizations, and summaries.

## 🚀 Live Demo
[👉 View Live App](#) <!-- Replace with your Vercel URL -->

## ✨ Features
- **Drag & drop** CSV file upload
- **AI-powered analysis** via Claude API (claude-sonnet-4)
- **Auto-generated insights** — summary, key findings, anomalies
- **Bar chart visualization** of the most interesting column
- **Row/column stats** at a glance
- Works with any CSV dataset

## 🛠️ Tech Stack
- React 18 + Vite
- Recharts (data visualization)
- Anthropic Claude API (`claude-sonnet-4-20250514`)

## 📦 Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/csv-ai-analyzer.git
cd csv-ai-analyzer

# Install dependencies
npm install

# Start dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) and enter your [Anthropic API key](https://console.anthropic.com).

## 🔑 API Key
You'll need a free Anthropic API key from [console.anthropic.com](https://console.anthropic.com). The key is used client-side and never stored.

## 🚢 Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/csv-ai-analyzer)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Repository
3. Deploy — no config needed!

## 📄 License
MIT
