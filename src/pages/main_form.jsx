import React, { useState, useEffect } from 'react';
import './main_form.css'; // Подключите стили
import logo from '../pics/logo.png';
function Navbar({ handleLogout }) {
    return (
        <header>
            <div className="nav-container">
                <div className="logo">
                    <img src={logo} alt="Logo" />
                </div>
                <nav>
                    <ul>
                        <li><a href="/main">Главная</a></li>
                    </ul>
                </nav>
                <div className="profile">
                    <a href="#" onClick={handleLogout}>Выход</a>
                </div>
            </div>
        </header>
    );
}

function MainPage() {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [deskMessages, setDeskMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onmessage = (event) => {
            const data = event.data;
            const lines = data.split('\n►');
            const newDeskMessages = [];
            const newChatMessages = [];

            lines.forEach((line) => {
                const parts = line.split('|');
                if (parts[1] === 'teacher' && parts[2] !== 'welcome_message') {
                    newDeskMessages.push(`${parts[2]}: ${parts[3]}`);
                } else if (parts[1] === 'teacher' && parts[2] === 'welcome_message') {
                    newDeskMessages.push(parts[3]);
                } else if (parts[1] === 'student') {
                    newChatMessages.push(`${parts[2]}: ${parts[3]}`);
                }
            });

            setDeskMessages(newDeskMessages);
            setMessages(newChatMessages);
        };

        return () => {
            socket.close();
        };
    }, []);

    const handleSendMessage = async () => {
        setLoading(true);
        try {
            const response = await fetch('/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            if (response.ok) {
                setMessage('');
            } else {
                alert('Ошибка при отправке сообщения');
            }
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (data.success) {
                window.location.href = '/login';
            } else {
                alert('Ошибка при выходе из системы');
            }
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    };


    return (
        <div>
            <Navbar handleLogout={handleLogout} />

            <div className="main-container">
                <div className="chat-desk">
                    <div id="desk">
                            {deskMessages.map((msg, index) => (
                                <p key={index}>{msg}</p>
                            ))}
                    </div>
                    <div id="chat">
                        {messages.map((msg, index) => (
                            <p key={index}>{msg}</p>
                        ))}
                    </div>

                </div>

                <div className="vvod-container">
                    <textarea
                        id="message"
                        rows="4"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                    ></textarea>
                    <button id="send-message" onClick={handleSendMessage} disabled={loading}>
                        {loading ? 'Отправка...' : 'Отправить'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MainPage;
