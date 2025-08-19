const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'el cerebro de gemini' directory
app.use(express.static(path.join(__dirname, 'el cerebro de gemini')));

// Handle all routes by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'el cerebro de gemini', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Abre http://localhost:${PORT} para ver la aplicación`);
});
