const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Please set GEMINI_API_KEY environment variable. You can run this script with: node --env-file=.env.local test-gemini.js");
  process.exit(1);
}

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
.then(r => r.json())
.then(data => {
  const models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
  console.log(models.map(m => m.name));
})
