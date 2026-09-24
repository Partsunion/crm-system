import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] p-4">
                    <div className="bg-[var(--bg-surface)] rounded-2xl shadow-xl max-w-lg w-full p-8 text-center border border-[var(--border)]">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                            Ein Fehler ist aufgetreten
                        </h1>

                        <p className="text-[var(--text-muted)] mb-6">
                            Das CRM konnte nicht geladen werden. Meistens liegt das an einer fehlenden API-Verbindung oder falschen Konfiguration.
                        </p>

                        {this.state.error && (
                            <div className="bg-[var(--bg-canvas)] rounded-xl p-4 mb-6 text-left overflow-auto max-h-40 border border-[var(--border)]">
                                <p className="font-mono text-xs text-red-600 break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Seite neu laden
                            </button>

                            <div className="text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--border)]">
                                Tipp: Prüfe die VITE_API_URL Umgebungsvariable auf Render.
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
