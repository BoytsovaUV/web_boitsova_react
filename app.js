const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');




const app = express();
const port = 3000;

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const crypto = require('crypto');
const secretKey = crypto.randomBytes(64).toString('hex');
console.log('Ключ сгенерирован\n'+secretKey);

require('dotenv').config();
// Проверка наличия SESSION_SECRET и вывод сообщения
if (process.env.SESSION_SECRET) {
    console.log('Установленный ключ\n' + process.env.SESSION_SECRET);
}
// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Установите true, если используете HTTPS
}));


// Получаем текущую дату и время
const now = new Date();
const formattedDate = now.toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
}).replace(',', '');

// Константа для сравнения (без даты)
const baseInfo = '►1|teacher|welcome_message|Добро пожаловать!|';

// Формируем строку с использованием текущей даты и времени
const chatFilePath = path.join(__dirname, 'chat.txt');
const chatData = `${baseInfo}${formattedDate}`;

fs.readFile(chatFilePath, 'utf8', (err, data) => {
    if (err) {
        if (err.code === 'ENOENT') {
            // Файл не существует, создаем и добавляем строку
            fs.writeFile(chatFilePath, chatData + '\n', (err) => {
                if (err) throw err;
                console.log('Файл chat.txt создан и приветственная строка добавлена.');
            });
        } else {
            throw err;
        }
    } else {
        // Файл существует, проверяем наличие строки без учета даты
        const lines = data.split('\n►');
        const exists = lines.some(line => line.startsWith(baseInfo));

        if (!exists) {
            fs.appendFile(chatFilePath, chatData + '\n►', (err) => {
                if (err) throw err;
                console.log('Приветствие добавлено в chat.txt.');
            });
        } else {
            console.log('Файл chat.txt найден.');
        }
    }
});

// Чтение файла и отправка содержимого клиенту при подключении
wss.on('connection', (ws) => {
    fs.readFile(chatFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
        } else {
            ws.send(data);
        }
    });

    // Отслеживание изменений файла и отправка обновлений клиенту
    fs.watchFile(chatFilePath, (curr, prev) => {
        fs.readFile(chatFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error(err);
            } else {
                wss.clients.forEach((client) => {
                    client.send(data);
                });
            }
        });
    });
});



// Middleware для проверки авторизации
function checkAuth(req, res, next) {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Для обработки JSON и URL-кодированных данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Добавьте этот маршрут перед раздачей статических файлов
app.get('/session-data', (req, res) => {
    if (req.session.isAuthenticated) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ message: 'Пользователь не авторизован' });
    }
});

// Раздача статических файлов
app.use(express.static(path.join(__dirname, 'build')));



// Перенаправление с корневого URL на страницу логина
app.get('/', (req, res) => {
    res.redirect('/login');
});
// Маршрут для входа
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Обработка логина
app.post('/login', (req, res) => {
    const { login } = req.body;

    if (!login) {
        return res.status(400).json({ success: false, message: "Логин не может быть пустым." });
    }

    // Сравниваем с переменной TEACHER из .env файла
    const teacherLogin = process.env.TEACHER;

    if (login === teacherLogin) {
        // Если логин совпадает с TEACHER, авторизовываемся как учитель
        req.session.username = login;
        req.session.account_type = 'teacher';
        req.session.isAuthenticated = true;
        res.json({ success: true });
    } else {
        // Если логин не совпадает, авторизовываемся как студент
        req.session.username = login;
        req.session.account_type = 'student';
        req.session.isAuthenticated = true;
        res.json({ success: true });
    }
});



// Маршрут для главной страницы (требует авторизации)
app.get('/main', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Функция для получения последнего ID
function getLastId() {
    if (fs.existsSync(chatFilePath)) {
        const data = fs.readFileSync(chatFilePath, 'utf8');
        const lines = data.split('►').filter(line => line.trim() !== ''); // Удаляем пустые строки
        const ids = lines.map(line => {
            const parts = line.split('|');
            return parts.length > 0 ? parseInt(parts[0], 10) : NaN; // Возвращаем ID или NaN
        }).filter(id => !isNaN(id)); // Фильтруем NaN

        const maxId = ids.length > 0 ? Math.max(...ids) : 0; // Получаем максимальный id или 0
        return maxId;
    }
    return 0;
}


// Обработка POST запроса на отправку сообщения
app.post('/send-message', (req, res) => {
    const { message } = req.body;

    if (!req.session.isAuthenticated) {
        return res.status(403).send('Unauthorized');
    }

    if (!message) {
        return res.status(400).send('Message is required');
    }

    const account_type = req.session.account_type;
    const login = req.session.username;
    const date = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    fs.readFile(chatFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'Ошибка обработки данных' });
        }

        const lines = data.trim().split('\n►');
        let newLines = [];

        // Проверим, есть ли строки, и если да, получим ID последней строки
        let lastId = 0;
        if (lines.length > 0) {
            const lastLine = lines[lines.length - 1];
            const parts = lastLine.split('|');
            lastId = parseInt(parts[0], 10); // Добавим основание 10 для явного указания системы счисления
        }

        // Генерируем новый ID
        const newId = getLastId() + 1;

        // Формируем новую строку
        newLines = [...lines, `${newId}|${account_type}|${login}|${message}|${date}`];

        // Записываем измененные данные обратно в файл
        fs.writeFile(chatFilePath, newLines.join('\n►'), 'utf8', (err) => {
            if (err) {
                console.error(err);
                return res.json({ success: false, message: 'Ошибка обработки данных' });
            }

            res.json({ success: true });
        });
    });
});



// Маршрут для выхода из системы
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Не удалось выйти из системы' });
        }
        res.clearCookie('connect.sid'); // Имя cookie может отличаться
        res.json({ success: true, redirectUrl: '/login' });
    });
});


// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
