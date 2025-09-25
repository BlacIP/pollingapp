import { useEffect, useState } from "react";
import { requestOtp, verifyOtp, getStoredAuth, storeAuth, clearAuthLogoutMarker } from "../api";

export default function AuthPage({ onSignedIn }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [resumeAuth, setResumeAuth] = useState(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('otp_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }

    const storedAuth = getStoredAuth();
    if (storedAuth) {
      if (storedAuth.loggedOut) {
        setResumeAuth(storedAuth);
        setStep('email');
        if (!savedEmail && storedAuth.user?.email) {
          setEmail(storedAuth.user.email);
        }
      } else {
        onSignedIn(storedAuth);
      }
    }
  }, [onSignedIn]);

  const resumeSession = () => {
    if (!resumeAuth) return;
    clearAuthLogoutMarker();
    storeAuth(resumeAuth.token, resumeAuth.user);
    onSignedIn({ token: resumeAuth.token, user: resumeAuth.user });
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const res = await requestOtp({
        email,
        name: mode === 'signup' ? name : '',
        phone: mode === 'signup' ? phone : '',
        mode // Pass the mode to backend
      });

      if (res?.ok) {
        setStep('otp');
        localStorage.setItem('otp_email', email);
        setMsg('We sent a 6-digit code to your email.');
      } else {
        setMsg(res?.error || 'Failed to send code');
      }
    } catch {
      setMsg('Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const res = await verifyOtp({ email, code });

      if (res && res.ok && res.token && res.user) {
        storeAuth(res.token, res.user);
        onSignedIn({ token: res.token, user: res.user });
      } else {
        setMsg(res?.error || 'Verification failed.');
      }
    } catch (err) {
      console.error('verifyOtp error:', err);
      setMsg('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    if (resumeAuth) return;
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setStep('email');
    setMsg('');
    setName('');
    setPhone('');
    setCode('');
  };

  return (
    <div className="max-w-md mx-auto card p-5 mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
        <button
          type="button"
          className="link text-sm"
          onClick={switchMode}
          disabled={resumeAuth !== null}
        >
          {mode === 'signin' ? 'Need an account?' : 'Have an account?'}
        </button>
      </div>

      {resumeAuth ? (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-lg font-semibold text-white mb-2">Welcome back!</p>
            <p className="text-muted">
              Continue as {resumeAuth.user?.name || resumeAuth.user?.email || 'this account'}.
            </p>
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={resumeSession}
          >
            Continue
          </button>

          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={() => {
              setResumeAuth(null);
              setMsg('');
              setStep('email');
              setEmail('');
              localStorage.removeItem('otp_email');
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          {step === 'email' && (
            <form onSubmit={submitEmail} className="space-y-3">
              <input
                className="input"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {mode === 'signup' && (
                <>
                  <input
                    className="input"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <input
                    className="input"
                    placeholder="Phone (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </>
              )}

              <button className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Sending…' : `Send ${mode === 'signin' ? 'sign in' : 'verification'} code`}
              </button>

              <button type="button" className="link text-sm w-full text-center" onClick={() => setStep('otp')}>
                I already have a code
              </button>

              {msg && <p className={`text-sm ${msg.includes('sent') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={submitCode} className="space-y-3">
              <p className="text-sm text-muted mb-3">
                Enter the 6-digit code sent to {email}
              </p>
              <input
                className="input"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={6}
              />
              <button className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button type="button" className="btn btn-ghost w-full" onClick={() => setStep('email')}>
                Back
              </button>
              {msg && <p className="text-sm text-red-400">{msg}</p>}
            </form>
          )}
        </>
      )}
    </div>
  );
}
