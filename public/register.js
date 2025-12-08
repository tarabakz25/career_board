async function api(path, options = {}) {
	const res = await fetch(path, {
		headers: { "Content-Type": "application/json" },
		credentials: "same-origin",
		...options,
	});
	if (!res.ok) {
		const msg = await res.json().catch(() => ({}));
		throw new Error(msg.message || res.statusText);
	}
	return res.json();
}

async function checkSessionRedirect() {
	const me = await api("/api/auth/me").catch(() => ({ user: null }));
	if (me.user) window.location.href = "/career_dashboard";
}

document
	.getElementById("registerForm")
	.addEventListener("submit", async (e) => {
		e.preventDefault();
		const form = e.target;
		const msg = document.getElementById("authMsg");
		msg.textContent = "";
		try {
			await api("/api/auth/register", {
				method: "POST",
				body: JSON.stringify({
					email: form.email.value,
					password: form.password.value,
				}),
			});
			window.location.href = "/career_dashboard";
		} catch (err) {
			msg.textContent = err.message;
		}
	});

checkSessionRedirect();
