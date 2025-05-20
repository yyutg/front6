const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(express.static(path.join(__dirname, 'frontend')));

const users = [];

app.use(session({
    secret: 'your_secret_key_here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

const cache = {
    data: null,
    timestamp: null,
    isValid: function() {
        if (!this.timestamp) return false;
        return (Date.now() - this.timestamp) < 60000;
    }
};

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (users.some(u => u.username === username)) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    users.push({ username, password: hashedPassword });

    res.status(201).json({ message: 'Пользователь зарегистрирован' });
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        req.session.user = { username };

        res.json({ message: 'Вход выполнен успешно' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Ошибка выхода');
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/check-auth', (req, res) => {
    if (req.session.user) {
        return res.json({ authenticated: true, user: req.session.user });
    }
    res.json({ authenticated: false });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

app.get('/data', (req, res) => {
    if (cache.isValid()) {
        return res.json({ 
            data: cache.data,
            fromCache: true,
            timestamp: new Date(cache.timestamp).toISOString()
        });
    }
    
    const newData = {
        message: 'Данные из API',
        randomNumber: Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString()
    };
    
    cache.data = newData;
    cache.timestamp = Date.now();
    
    res.json({ 
        data: newData,
        fromCache: false,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});