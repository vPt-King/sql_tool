const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const db = require('./db'); // Import database connection
const { nanoid } = require('nanoid'); // Import nanoid
const app = express();
const port = 3000;

app.use(morgan('combined'));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
//app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render("index");
});



//Them ban ghi moi
app.post('/add-record', async (req, res) => {
  try {
    console.log('Received body:', req.body);

    const { name, command, description, note, tags } = req.body;
    
    if (!name || !command) {
      return res.status(400).send('Name và Command là trường bắt buộc');
    }

    const trimmedData = {
      id: nanoid(10), // Tạo ID 10 ký tự
      name: name.trim(),
      command: command.trim(),
      description: description ? description.trim() : '',
      note: note ? note.trim() : ''
    };

    // Start a transaction
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert the record
      const recordQuery = `
        INSERT INTO command (id, name, command, description, note)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const recordValues = [
        trimmedData.id,
        trimmedData.name,
        trimmedData.command,
        trimmedData.description,
        trimmedData.note
      ];

      const recordResult = await client.query(recordQuery, recordValues);

      // If tags are provided, create the tag associations
      if (tags && tags.length > 0) {
        const tagQuery = `
          INSERT INTO command_tags (command_id, tag_id)
          VALUES ($1, $2)
        `;

        for (const tagId of tags) {
          await client.query(tagQuery, [trimmedData.id, tagId]);
        }
      }

      await client.query('COMMIT');
      console.log('Record inserted:', recordResult.rows[0]);
      res.status(200).send('Thêm bản ghi thành công');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Có lỗi xảy ra khi xử lý yêu cầu');
  }
});

// Tag Management Routes
app.post('/add-tag', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).send('Tag name is required');
    }

    const trimmedName = name.trim();
    
    // Check if tag already exists
    const checkQuery = 'SELECT * FROM tags WHERE name = $1';
    const existingTag = await db.query(checkQuery, [trimmedName]);
    
    if (existingTag.rows.length > 0) {
      return res.status(400).send('Tag already exists');
    }

    const query = `
      INSERT INTO tags (id, name)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const values = [nanoid(10), trimmedName];
    const result = await db.query(query, values);
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Error processing request');
  }
});

app.get('/tags', async (req, res) => {
  try {
    const query = 'SELECT * FROM tags ORDER BY name';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Error fetching tags');
  }
});

app.delete('/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete from command_tags
    await db.query('DELETE FROM command_tags WHERE tag_id = $1', [id]);
    
    // Then delete the tag
    const result = await db.query('DELETE FROM tags WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).send('Tag not found');
    }
    
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Error deleting tag');
  }
});

app.post('/assign-tag', async (req, res) => {
  try {
    const { commandId, tagId } = req.body;
    
    if (!commandId || !tagId) {
      return res.status(400).send('Command ID and Tag ID are required');
    }

    const query = `
      INSERT INTO command_tags (command_id, tag_id)
      VALUES ($1, $2)
      ON CONFLICT (command_id, tag_id) DO NOTHING
      RETURNING *
    `;
    
    const result = await db.query(query, [commandId, tagId]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Error assigning tag');
  }
});

app.delete('/remove-tag/:commandId/:tagId', async (req, res) => {
  try {
    const { commandId, tagId } = req.params;
    
    const query = 'DELETE FROM command_tags WHERE command_id = $1 AND tag_id = $2 RETURNING *';
    const result = await db.query(query, [commandId, tagId]);
    
    if (result.rows.length === 0) {
      return res.status(404).send('Tag assignment not found');
    }
    
    res.json({ message: 'Tag removed successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Error removing tag');
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});