#!/bin/bash

echo "========================================"
echo "ChatGPT API Setup for Know Law"
echo "========================================"
echo ""
echo "This script will help you set up the ChatGPT API key."
echo ""
echo "Step 1: Get your API key from https://platform.openai.com/api-keys"
echo "Step 2: Enter your API key below"
echo ""
read -p "Enter your OpenAI API key: " API_KEY

if [ -z "$API_KEY" ]; then
    echo ""
    echo "Error: API key cannot be empty!"
    exit 1
fi

export OPENAI_API_KEY="$API_KEY"
echo ""
echo "✅ API key set for this session!"
echo ""
echo "To make it permanent, add this to your ~/.bashrc or ~/.zshrc:"
echo "  export OPENAI_API_KEY=\"$API_KEY\""
echo ""
echo "Starting server with ChatGPT enabled..."
echo ""
npm start


