const state = {
	user: null,
	jobs: [],
	currentJob: null,
};

const jobsListEl = document.getElementById("jobsList");
const jobTemplate = document.getElementById("jobCardTemplate");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const adminLink = document.getElementById("adminLink");

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

function formatSalary(min, max) {
	if (!min && !max) return "給与非公開";
	const f = (n) => Number(n).toLocaleString("ja-JP");
	if (min && max) return `¥${f(min)} - ¥${f(max)}`;
	if (min) return `¥${f(min)} 以上`;
	return `~ ¥${f(max)}`;
}

function formatDate(d) {
	if (!d) return "-";
	return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(
		new Date(d),
	);
}

function setRoleUI(user) {
	if (!user) {
		window.location.href = "/login";
		return;
	}
	userEmail.textContent = user.email;
	if (user.role === "admin") {
		adminLink.style.display = "";
	} else {
		adminLink.style.display = "none";
	}
}

async function fetchMe() {
	const data = await api("/api/auth/me");
	state.user = data.user;
	if (!state.user) {
		window.location.href = "/login";
		return;
	}
	setRoleUI(state.user);
}

async function loadJobs(params = {}) {
	const query = new URLSearchParams();
	Object.entries(params).forEach(([k, v]) => {
		if (v) query.set(k, v);
	});
	const url = query.toString() ? `/api/jobs?${query}` : "/api/jobs";
	const jobs = await api(url);
	state.jobs = jobs;
	renderJobs();
}

function renderJobs() {
	jobsListEl.innerHTML = "";
	state.jobs.forEach((job) => {
		const clone = jobTemplate.content.cloneNode(true);
		clone.querySelector(".company").textContent = job.company;
		clone.querySelector(".title").textContent = job.title;
		clone.querySelector(".location").textContent = job.location || "勤務地未定";
		clone.querySelector(".salary").textContent = formatSalary(
			job.salaryMin,
			job.salaryMax,
		);
		clone.querySelector(".deadline").textContent = job.deadline
			? `締切: ${formatDate(job.deadline)}`
			: "締切未設定";
		clone.querySelector(".view").addEventListener("click", () => {
			window.location.href = `/apply?id=${job.id}`;
		});
		const applyBtn = clone.querySelector(".apply");
		applyBtn.addEventListener("click", () => apply(job.id));
		if (!state.user || state.user.role === "admin") {
			applyBtn.disabled = true;
			applyBtn.textContent =
				state.user?.role === "admin" ? "管理者" : "ログインして応募";
		} else if (
			state.user.appliedJobId &&
			state.user.appliedJobId !== job.id
		) {
			applyBtn.disabled = true;
			applyBtn.textContent = "他に応募中";
		} else if (state.user.appliedJobId === job.id) {
			applyBtn.textContent = "応募済み";
			applyBtn.disabled = true;
		}
		jobsListEl.appendChild(clone);
	});
}

async function apply(jobId) {
	try {
		await api(`/api/jobs/${jobId}/apply`, {
			method: "POST",
			body: JSON.stringify({}),
		});
		state.user.appliedJobId = jobId;
		renderJobs();
	} catch (e) {
		alert(e.message);
	}
}

logoutBtn.addEventListener("click", async () => {
	await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
	window.location.href = "/login";
});

document.getElementById("searchBtn").addEventListener("click", () => {
	loadJobs({
		search: document.getElementById("searchKeyword").value,
		location: document.getElementById("searchLocation").value,
		minSalary: document.getElementById("searchSalary").value,
	});
});

(async function init() {
	await fetchMe();
	await loadJobs();
})();
