const http = require('http');
const { execSync } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.url === '/api/screenshot') {
    try {
      // Grab screenshot from iPad via Mac
      execSync(`timeout 15 ssh ssh_16901 "curl -s --max-time 10 -o /tmp/ipad_ss.jpg http://localhost:9301/screenshot"`, { timeout: 20000 });
      const img = execSync(`scp ssh_16901:/tmp/ipad_ss.jpg /dev/stdout`, { maxBuffer: 5 * 1024 * 1024 });
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' });
      res.end(img);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Screenshot failed: ' + e.message);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(14556, '0.0.0.0', () => console.log('Screenshot server on :14556'));
