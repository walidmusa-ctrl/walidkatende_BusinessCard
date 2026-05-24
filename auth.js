// ==========================================
// AUTH.JS - PRODUCTION MULTI-USER APPLICATIONS WITH RECOVERY
// ==========================================

const SUPABASE_URL = "https://rgfzodjtcfxnydgsuktn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZnpvZGp0Y2Z4bnlkZ3N1a3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODI2NTcsImV4cCI6MjA4OTc1ODY1N30.3rXsRl4k6VmGk3gMCCPsI150NhelbI5SiRRE05cUIus";

let dbClient = null;
if (window.supabase) {
    dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Supabase CDN failed to load properly.");
}

let authMode = "login";

function switchTab(mode) {
    authMode = mode;
    const usernameGroup = document.getElementById("usernameGroup");
    const authTitle = document.getElementById("authTitle");
    const submitBtn = document.getElementById("submitBtn");
    const msgBox = document.getElementById("msgBox");

    msgBox.textContent = "";

    if (mode === "signup") {
        document.getElementById("signupTab").classList.add("active");
        document.getElementById("loginTab").classList.remove("active");
        usernameGroup.classList.remove("hidden");
        document.getElementById("usernameInput").required = true;
        authTitle.textContent = "Create Account";
        submitBtn.textContent = "Register & Create Card";
    } else if (mode === "login") {
        document.getElementById("loginTab").classList.add("active");
        document.getElementById("signupTab").classList.remove("active");
        usernameGroup.classList.add("hidden");
        document.getElementById("usernameInput").required = false;
        authTitle.textContent = "Welcome Back";
        submitBtn.textContent = "Log In";
    } else if (mode === "recovery_reset") {
        // Special UI state when clicking a recovery link from email
        document.getElementById("loginTab").classList.remove("active");
        document.getElementById("signupTab").classList.remove("active");
        usernameGroup.classList.add("hidden");
        document.getElementById("usernameInput").required = false;
        document.getElementById("emailInput").closest('.form-group').classList.add('hidden'); // Hide email input
        document.getElementById("emailInput").required = false;

        authTitle.textContent = "Reset Your Password";
        document.getElementById("passwordInput").placeholder = "Enter your brand new password";
        submitBtn.textContent = "Save New Password";
    }
}

// 1. TRIGGER RECOVERY EMAIL
async function triggerPasswordRecovery() {
    if (!dbClient) return;
    const email = document.getElementById("emailInput").value.trim();
    const msgBox = document.getElementById("msgBox");

    if (!email) {
        msgBox.style.color = "#ef4444";
        msgBox.textContent = "Please type your email address into the form first, then click Forgot Password.";
        return;
    }

    msgBox.style.color = "#3b82f6";
    msgBox.textContent = "Sending secure reset link to your email...";

    const { error } = await dbClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname // Dynamically targets your live auth.html
    });

    if (error) {
        msgBox.style.color = "#ef4444";
        msgBox.textContent = error.message;
    } else {
        msgBox.style.color = "#10b981";
        msgBox.textContent = "Reset link sent! Check your email inbox and spam folder.";
    }
}

// 2. MAIN AUTHENTICATION ROUTER
async function handleAuth(event) {
    event.preventDefault();
    if (!dbClient) return;

    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;
    const msgBox = document.getElementById("msgBox");

    msgBox.style.color = "#3b82f6";
    msgBox.textContent = "Processing details...";

    // ==========================================
    // MODE: PASSWORD RESET SUBMISSION
    // ==========================================
    if (authMode === "recovery_reset") {
        if (password.length < 6) {
            msgBox.style.color = "#ef4444";
            msgBox.textContent = "Password must be at least 6 characters.";
            return;
        }

        const { error } = await dbClient.auth.updateUser({ password: password });

        if (error) {
            msgBox.style.color = "#ef4444";
            msgBox.textContent = "Failed to update: " + error.message;
        } else {
            msgBox.style.color = "#10b981";
            msgBox.textContent = "Password updated successfully! Redirecting you to login...";
            setTimeout(() => {
                window.location.href = "auth.html";
            }, 2000);
        }
        return;
    }

    // ==========================================
    // MODE: SIGN UP / REGISTRATION
    // ==========================================
    if (authMode === "signup") {
        const username = document.getElementById("usernameInput").value.trim().toLowerCase();

        const { data: existingUser } = await dbClient
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle();

        if (existingUser) {
            msgBox.style.color = "#ef4444";
            msgBox.textContent = "Error: That username is already claimed by another user.";
            return;
        }

        const { data: authData, error: authError } = await dbClient.auth.signUp({
            email: email,
            password: password
        });

        if (authError) {
            msgBox.style.color = "#ef4444";
            msgBox.textContent = authError.message;
            return;
        }

        const userUuid = authData.user?.id;

        if (userUuid) {
            if (authData.session) {
                await dbClient.auth.setSession(authData.session);
            }

            const { error: profileError } = await dbClient
                .from('profiles')
                .insert([
                    {
                        id: userUuid,
                        username: username,
                        name: username,
                        workplace: "",
                        title: "",
                        bio: "",
                        profileImage: "",
                        links: [],
                        projects: [],
                        is_approved: false
                    }
                ]);

            if (profileError) {
                console.error("Profile row insert failure:", profileError);
                msgBox.style.color = "#ef4444";
                msgBox.textContent = "Account created, but database configuration failed: " + profileError.message;
                return;
            }

            msgBox.style.color = "#3b82f6";
            msgBox.textContent = "Account created! Waiting for administrator approval before you can log in.";

            document.getElementById("authForm").reset();
            switchTab("login");
        }

    // ==========================================
    // MODE: LOGIN VERIFICATION
    // ==========================================
    } else {
        const { data: loginData, error: loginError } = await dbClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (loginError) {
            msgBox.style.color = "#ef4444";
            msgBox.textContent = loginError.message;
            return;
        }

        const userUuid = loginData.user?.id;

        const { data: profileRow, error: profileFetchError } = await dbClient
            .from('profiles')
            .select('username, is_approved')
            .eq('id', userUuid)
            .single();

        if (profileFetchError || !profileRow) {
            msgBox.style.color = "#ef4444";
            msgBox.textContent = "Profile records could not be found for this account.";
            return;
        }

        if (profileRow.is_approved === true || profileRow.is_approved === 'true') {

            msgBox.style.color = "#10b981";
            msgBox.textContent = "Success! Redirecting...";

            setTimeout(() => {
                window.location.href = `edit.html?user=${profileRow.username}`;
            }, 1200);

        } else {
            msgBox.style.color = "#f59e0b";
            msgBox.textContent = "Your account is pending review. Access will be granted once approved by the admin.";

            await dbClient.auth.signOut();
            return;
        }
    }
}

// 3. LISTEN FOR INCOMING EMAIL RESET TOKENS ON PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
    // Supabase returns password reset tokens inside the URL anchor hash fragments (#)
    if (window.location.hash && window.location.hash.includes("type=recovery")) {
        // Swap UI inputs immediately to capture password update state
        switchTab("recovery_reset");
    }
});

window.switchTab = switchTab;
window.handleAuth = handleAuth;
window.triggerPasswordRecovery = triggerPasswordRecovery;