import './App.css';
import './styles/editor.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Toaster} from 'react-hot-toast';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Profile from './components/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import AIAssistant from './components/AIAssistant';
import {RecoilRoot} from "recoil";
import {AuthProvider} from './context/AuthContext';
import AuthSuccess from './components/auth/AuthSuccess';

function App() {
    return (
        <>
            <div>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#ffffff',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '500',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#ffffff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#ffffff',
                            },
                        },
                    }}
                />
            </div>
            <BrowserRouter>
                <AuthProvider>
                    <RecoilRoot>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/auth/success" element={<AuthSuccess />} />
                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <Profile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/editor/:roomId"
                                element={
                                    <ProtectedRoute>
                                        <EditorPage />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                        <AIAssistant />
                    </RecoilRoot>
                </AuthProvider>
            </BrowserRouter>
        </>
    );
}

export default App;