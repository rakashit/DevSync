const express = require('express');
const { OpenAI } = require('openai');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_if_not_provided',
});

router.post('/review', verifyToken, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required for AI review' });
    }

    if (!process.env.OPENAI_API_KEY) {
      // Mock response for dev if no key
      return res.status(200).json({
        review: "This is a mock AI review. \n- **Bugs:** None found.\n- **Improvements:** Consider using better variable names.\n- **Complexity:** Looks O(N)."
      });
    }

    const prompt = `You are a senior software engineer. Review the following ${language || ''} code. List bugs, improvements, and complexity issues clearly.\n\nCode:\n${code}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt }
      ],
    });

    const aiReview = completion.choices[0].message.content;

    res.status(200).json({ review: aiReview });
  } catch (error) {
    console.error('Error with AI review:', error);
    res.status(500).json({ error: 'Failed to generate AI review' });
  }
});

router.post('/autocomplete', verifyToken, async (req, res) => {
  try {
    const { codeBeforeCursor, language } = req.body;

    if (!codeBeforeCursor) {
      return res.status(400).json({ error: 'Code before cursor is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({ completion: " // Mock completion" });
    }

    const prompt = `You are a precise AI code completion assistant. Provide ONLY the immediate next logical snippet of ${language || 'code'} to follow this exactly. Do not provide explanations, do not provide markdown formatting, just the raw code text that logically completes the current thought:\n\n${codeBeforeCursor}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      max_tokens: 50,
      temperature: 0.2,
      stop: ["\n\n"]
    });

    res.status(200).json({ completion: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error with AI autocomplete:', error);
    res.status(500).json({ error: 'Failed to generate autocomplete' });
  }
});

module.exports = router;
