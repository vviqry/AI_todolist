const apiKey = 'AIzaSyC8zsoLo5O-6S30_C2Qj9BJdrXunmwUT-k';
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
.then(r => r.json())
.then(data => {
  const models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
  console.log(models.map(m => m.name));
})
