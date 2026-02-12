<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MarketGenius AI

Application React/Vite pour recherche produit, analyse de tendances et génération de contenus marketing IA.

## Démarrage

1. Installer les dépendances:
   ```bash
   npm install
   ```
2. Créer un `.env.local` (optionnel) avec vos clés:
   ```bash
   VITE_GEMINI_API_KEY=
   VITE_OPENAI_API_KEY=
   VITE_ANTHROPIC_API_KEY=
   VITE_OLLAMA_API_KEY=
   VITE_OLLAMA_BASE_URL=https://ollama.com
   VITE_OLLAMA_MODEL=gpt-oss:120b
   ```
3. Lancer:
   ```bash
   npm run dev
   ```

## Providers supportés

- **Gemini** (texte, image, audio, vidéo Veo)
- **OpenAI** (texte/JSON)
- **Anthropic** (texte/JSON)
- **Ollama Cloud API** (texte/JSON distant via `https://ollama.com/api/chat`)

Le provider actif + les clés sont aussi enregistrés localement dans SQLite (via Settings).

## Notes API

- Les accès API côté front utilisent **`import.meta.env`** (Vite) et non `process.env`.
- Les fonctions recherche/tendance/stratégie basculent selon le provider actif.
- Les médias avancés (image/vidéo/audio) restent sur Gemini.
- Pour Ollama Cloud, créez une clé sur https://ollama.com/settings/keys et utilisez-la comme `VITE_OLLAMA_API_KEY`.


### Vérifier Ollama Cloud

```bash
curl https://ollama.com/api/tags

curl https://ollama.com/api/chat \
  -H "Authorization: Bearer $OLLAMA_API_KEY" \
  -d '{
    "model": "gpt-oss:120b",
    "messages": [{"role": "user", "content": "Why is the sky blue?"}],
    "stream": false
  }'
```
