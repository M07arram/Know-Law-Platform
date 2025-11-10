# ChatGPT API Setup Guide

This guide will help you set up the ChatGPT API integration for the Know Law chat assistant.

## Prerequisites

1. An OpenAI account (sign up at https://platform.openai.com)
2. An OpenAI API key

## Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Give it a name (e.g., "Know Law Chat")
5. Copy the API key (you won't be able to see it again!)

## Step 2: Set the API Key

### Option 1: Environment Variable (Recommended)

**Windows PowerShell:**
```powershell
$env:OPENAI_API_KEY="sk-your-api-key-here"
```

**Windows Command Prompt:**
```cmd
set OPENAI_API_KEY=sk-your-api-key-here
```

**Linux/Mac:**
```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

### Option 2: Create .env File (Recommended for Production)

Create a `.env` file in the project root:

```
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

**Note:** Make sure to add `.env` to your `.gitignore` file to keep your API key secure!

## Step 3: Start the Server

```bash
npm start
```

## Step 4: Test the Chat

1. Navigate to the chat page
2. Ask a question about Egyptian law
3. The AI should respond using ChatGPT

## Model Options

You can use different OpenAI models by setting the `OPENAI_MODEL` environment variable:

- `gpt-3.5-turbo` (default) - Fast and cost-effective
- `gpt-4` - More capable but more expensive
- `gpt-4-turbo` - Latest and most capable

Example:
```bash
export OPENAI_MODEL="gpt-4"
```

## Fallback Mode

If no API key is configured, the chat will automatically use fallback rule-based responses focused on Egyptian law. This ensures the chat always works, even without an API key.

## Troubleshooting

### Chat not responding with ChatGPT

1. **Check API key**: Make sure `OPENAI_API_KEY` is set correctly
2. **Check server logs**: Look for error messages in the console
3. **Verify API key**: Test your key at https://platform.openai.com/api-keys
4. **Check billing**: Ensure you have credits in your OpenAI account

### API Errors

- **401 Unauthorized**: Invalid API key
- **429 Too Many Requests**: Rate limit exceeded, wait a moment
- **500 Internal Server Error**: Check server logs for details

### Cost Management

- Monitor usage at https://platform.openai.com/usage
- Set usage limits at https://platform.openai.com/account/billing/limits
- Consider using `gpt-3.5-turbo` for lower costs

## Security Notes

⚠️ **IMPORTANT**: Never commit your API key to version control!

- Add `.env` to `.gitignore`
- Don't share your API key publicly
- Rotate your API key if it's exposed
- Use environment variables, not hardcoded keys

## Support

- OpenAI Documentation: https://platform.openai.com/docs
- OpenAI Support: https://help.openai.com


