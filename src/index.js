import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from './pages/login_form';
import Main from './pages/main_form';


const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/login" replace />,
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/main',
        element: <Main />,
    },
    {
        path: '*',
        element: <Navigate to="/login" replace />,
    },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);

reportWebVitals();
