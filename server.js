const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

const slackURL = process.env.SLACK_URL;
const slackToken = process.env.SLACK_TOKEN;
const openAIURL = process.env.OPENAI_URL;
const openAIToken = process.env.OPENAI_TOKEN;
let channel_id
let response_url

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.timeout = 10000;

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

app.post('/', async (req, res) => {
  res.send('Please wait...');
  channel_id = req.body.channel_id
  response_url = req.body.response_url
  try {
    const messages = await getSlackMessages();
    const openAI = await askOpenAI(messages);
    const result = await postResponse(openAI);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error occurred');
  }
});

async function getSlackMessages() {
  const response = await axios.get(`${slackURL}channel=${channel_id}`, {
    headers: {
      Authorization: `Bearer ${slackToken}`,
    },
  });
  const messagesList = [];
  const messages = response.data.messages.reverse();
  messages.forEach((message) => {
    if (message.blocks) {
      messagesList.push(message.text);
    }
  });
  return messagesList;
}

async function askOpenAI(messages) {
  const data = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: `Resume la siguiente conversación:\n- ${messages.join('\n- ')}`,
      },
    ],
  };
  const response = await axios.post(openAIURL, data, {
    headers: {
      Authorization: `Bearer ${openAIToken}`,
    },
  });
  return response.data.choices[0].message.content;
}

async function postResponse(openAI) {
  const data = {
    "replace_original": "true",
    "text": openAI
  };
  const response = await axios.post(response_url, data, {
    headers: {
      Authorization: `Bearer ${slackToken}`,
    },
  });
  return response.data
}

app.listen(port, () => {
  console.log(`Server running at https://localhost:${port}/`);
});
