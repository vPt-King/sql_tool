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
        const tagIds = [];
        const existingTagsQuery = `
          SELECT id, name 
          FROM tag 
          WHERE name = ANY($1)
        `;
        
        // Kiểm tra các tag đã tồn tại
        const existingTagsResult = await client.query(existingTagsQuery, [tags]);
        const existingTags = existingTagsResult.rows;
        const existingTagNames = existingTags.map(tag => tag.name);
        
        // Lọc ra những tag chưa tồn tại
        const newTags = tags.filter(tag => !existingTagNames.includes(tag));
        
        // Thêm ID của các tag đã tồn tại vào mảng tagIds
        existingTags.forEach(tag => tagIds.push(tag.id));

        // Insert các tag mới
        if (newTags.length > 0) {
          const tagQuery = `
            INSERT INTO tag (id, name)
            VALUES ($1, $2)
          `;

          for (const tag of newTags) {
            const newTagId = nanoid(10);
            tagIds.push(newTagId);
            await client.query(tagQuery, [newTagId, tag]);
          }
        }

        // Insert vào bảng command_tag cho tất cả các tag
        const tagCommandQuery = `
          INSERT INTO command_tag (id, command_id, tag_id)
          VALUES ($1, $2, $3)
        `;

        for (const tagId of tagIds) {
          await client.query(tagCommandQuery, [nanoid(10), trimmedData.id, tagId]);
        }
      }

      await client.query('COMMIT');
      console.log('Record inserted:', recordResult.rows[0]);
      res.status(200).send(JSON.stringify({ success: true, message: 'Thêm bản ghi thành công' }));
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


app.get('/tags', async (req, res) => {
  try {
    const query = 'SELECT * FROM tag ORDER BY name';
    const result = await db.pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Error fetching tags');
  }
});

app.get('/records', async (req, res) => {
  try {
    const query = 'SELECT id, name, command FROM command ORDER BY name';
    const result = await db.pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Error fetching records');
  }
});

// Route để lấy chi tiết record và tags của nó
app.get('/record/:id', async (req, res) => {
  const recordId = req.params.id;
  
  try {
    // Lấy thông tin chi tiết của record
    const recordQuery = `
      SELECT id, name, command, description, note
      FROM command 
      WHERE id = $1
    `;
    const recordResult = await db.pool.query(recordQuery, [recordId]);
    
    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record không tồn tại' });
    }

    // Lấy thông tin về các command_tag của record này
    const commandTagsQuery = `
      SELECT ct.id, ct.tag_id, t.name as tag_name
      FROM command_tag ct
      JOIN tag t ON ct.tag_id = t.id
      WHERE ct.command_id = $1
    `;
    const commandTagsResult = await db.pool.query(commandTagsQuery, [recordId]);

    // Trả về cả thông tin record và command_tags
    res.json({
      record: recordResult.rows[0],
      commandTags: commandTagsResult.rows
    });
  } catch (error) {
    console.error('Error fetching record details:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin record' });
  }
});





app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});