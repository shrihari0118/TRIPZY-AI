import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";



const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  try {
    const res = await fetch("http://localhost:8000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.detail || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("name", data.name);

    window.location.href = "/dashboard";

  } catch {
    setError("Server error. Try again later.");
  }
};

const images = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
  "https://images.unsplash.com/photo-1470770903676-69b98201ea1c",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
];

const [currentImage, setCurrentImage] = useState(0);
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  }, 4000); // 4 seconds

  return () => clearInterval(interval);
}, []);

  return (
  // 🌄 Full Background
  <motion.div
initial={{ opacity: 0, y: 40 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -40 }}
    transition={{ duration: 0.4 }}
    className="min-h-screen flex items-center justify-center bg-cover bg-center px-4"
    style={{
      backgroundImage:
        "url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee)",
    }}
  >

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-2">

        {/* LEFT - FORM */}
        <div className="p-10 flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
          <p className="text-gray-500 mb-8">
            Login to continue your journey
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-sm text-gray-500"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
{error && (
 <p className="text-red-500 text-sm text-center animate-pulse">{error}</p>
)}

            <button
              type="submit"
              className="w-full py-3 rounded-lg text-white font-semibold 
              bg-gradient-to-r from-blue-500 to-green-500 hover:opacity-90 transition"
            >
              Login
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 font-semibold">
              Register
            </Link>
          </p>
        </div>

        {/* RIGHT - INFO PANEL */}
<div
  className="hidden md:flex flex-col justify-center p-10 text-white
  animate-slide-fade relative overflow-hidden"
>

  {/* Sliding Images */}
<div className="absolute inset-0 overflow-hidden">

  <div
    className="flex w-full h-full transition-transform duration-1000 ease-in-out"
    style={{
      transform: `translateX(-${currentImage * 100}%)`,
    }}
  >
    {images.map((img, index) => (
      <div
        key={index}
        className="min-w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url(${img})` }}
      ></div>
    ))}
  </div>

</div>


  {/* Gradient Overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/70 to-green-400/70"></div>

  {/* Content */}
  <div className="relative animate-float">
    <h2 className="text-3xl font-bold mb-4">
      AI Travel Companion
    </h2>

    <p className="text-lg leading-relaxed max-w-sm">
      Smart guidance, expense tracking, and seamless exploration.
    </p>
  </div>

</div>



      </div>
</motion.div>
);
};

export default Login;
