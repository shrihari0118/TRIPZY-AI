import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: Record<string, unknown>) => void;
                    renderButton: (
                        element: HTMLElement,
                        config: Record<string, unknown>
                    ) => void;
                };
            };
        };
    }
}

interface GoogleSignInButtonProps {
    onError?: (message: string) => void;
}

const GoogleSignInButton = ({ onError }: GoogleSignInButtonProps) => {
    const buttonRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);

    const handleCredentialResponse = async (response: { credential: string }) => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_token: response.credential }),
            });

            const data = await res.json();

            if (!res.ok) {
                onError?.(data.detail || "Google sign-in failed");
                setLoading(false);
                return;
            }

            // Store JWT and user info using existing auth pattern
            localStorage.setItem("token", data.token);
            localStorage.setItem("name", data.name);

            window.location.href = "/dashboard";
        } catch {
            onError?.("Server error during Google sign-in. Try again later.");
            setLoading(false);
        }
    };

    useEffect(() => {
        const initGoogle = () => {
            if (!window.google || !buttonRef.current) return;

            window.google.accounts.id.initialize({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
            });

            window.google.accounts.id.renderButton(buttonRef.current, {
                theme: "outline",
                size: "large",
                text: "continue_with",
                width: "100%",
                logo_alignment: "left",
            });
        };

        // Google script might not be loaded yet — poll briefly
        if (window.google) {
            initGoogle();
        } else {
            const interval = setInterval(() => {
                if (window.google) {
                    clearInterval(interval);
                    initGoogle();
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, []);

    return (
        <div className="w-full">
            {loading && (
                <div className="flex items-center justify-center py-3">
                    <svg
                        className="animate-spin h-5 w-5 text-gray-500 mr-2"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                    <span className="text-sm text-gray-500">Signing in with Google…</span>
                </div>
            )}
            <div
                ref={buttonRef}
                className={loading ? "hidden" : "flex justify-center"}
            />
        </div>
    );
};

export default GoogleSignInButton;
