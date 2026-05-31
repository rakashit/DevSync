const express = require('express');
const { db } = require('../firebase');
const { verifyToken } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create a new room
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    const uid = req.user.uid;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const roomId = uuidv4();
    
    const newRoom = {
      id: roomId,
      title,
      description: description || '',
      ownerId: uid,
      members: [uid],
      status: 'open', // open, merged, closed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (db) {
      await db.collection('rooms').doc(roomId).set(newRoom);
    } else {
      console.warn('Firebase DB not initialized. Skipping DB write (dev mode).');
    }

    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's rooms
router.get('/', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    
    if (!db) {
      return res.json([]);
    }

    const roomsRef = db.collection('rooms');
    const snapshot = await roomsRef.where('members', 'array-contains', uid).get();
    
    const rooms = [];
    snapshot.forEach(doc => {
      rooms.push(doc.data());
    });

    res.status(200).json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update room status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const uid = req.user.uid;

    if (!['open', 'merged', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (!db) {
      return res.status(200).json({ message: 'Mock updated' });
    }

    const roomRef = db.collection('rooms').doc(id);
    const room = await roomRef.get();

    if (!room.exists) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.data().ownerId !== uid) {
      return res.status(403).json({ error: 'Only the room owner can change status' });
    }

    await roomRef.update({
      status,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: 'Status updated successfully', status });
  } catch (error) {
    console.error('Error updating room status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a room
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    if (!db) {
      return res.status(200).json({ message: 'Mock deleted' });
    }

    const roomRef = db.collection('rooms').doc(id);
    const room = await roomRef.get();

    if (!room.exists) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.data().ownerId !== uid) {
      return res.status(403).json({ error: 'Only the room owner can delete the room' });
    }

    await roomRef.delete();

    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
