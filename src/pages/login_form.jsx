import React, { useState } from 'react';
import './login_form.css'; // Подключите стили
const LoginForm = () => {
    const [login, setLogin] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ login }),
            });

            const data = await response.json();
            if (data.success) {
                // Успешный вход
                window.location.href = '/main';
            } else {
                // Обработка неуспешного входа
                setErrorMessage(data.message || 'Не удалось войти.');
            }
        } catch (error) {
            console.error("Ошибка:", error);
            setErrorMessage("Произошла ошибка на сервере.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {loading && (
                <div id="loading">
                    <img src="../pics/load.gif" alt="Loading..." />
                </div>
            )}
            <h2>Вход</h2>
            <form onSubmit={handleSubmit}>
                <label htmlFor="login">Логин:</label>
                <input
                    type="text"
                    id="login"
                    name="login"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    required
                />
                <button type="submit">Войти</button>
            </form>
            {errorMessage && <div id="errorMessage" style={{ color: 'red' }}>{errorMessage}</div>}
        </div>
    );
};

export default LoginForm;
