const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const app = express();
const port = process.env.PORT || 3000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors({
  origin: 'https://abdkhandev.github.io',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const requests = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS = 60000;
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  let data = requests.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > data.reset) data = { count: 0, reset: now + WINDOW_MS };
  if (data.count >= RATE_LIMIT) return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  data.count++;
  requests.set(ip, data);
  next();
});

app.post('/api/solve', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are SolveMyCar, an expert AI mechanic. Provide detailed, step-by-step diagnostic advice based on user symptoms. Use lists, bold key terms, and suggest tools/codes. Keep responses concise, helpful, and safe—advise professional help for serious issues. Format with HTML like <ol>, <ul>, <b> for readability.'
        },
        { role: 'user', content: prompt }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 500
    });
    const reply = completion.choices[0].message.content;
    res.json({ html: reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI service error. Try again later.' });
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));