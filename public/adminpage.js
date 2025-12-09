const state = {
	user: null,
	jobs: [],
};

const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

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

async function fetchMe() {
	const data = await api("/api/auth/me");
	state.user = data.user;
	if (!state.user) {
		window.location.href = "/login";
		return;
	}
	if (state.user.role !== "admin") {
		window.location.href = "/career_dashboard";
		return;
	}
	userEmail.textContent = state.user.email;
}

async function loadJobs() {
	const jobs = await api("/api/jobs");
	state.jobs = jobs;
	renderAdminJobs();
}

async function renderAdminJobs() {
	const container = document.getElementById("adminJobs");
	const header = document.createElement("div");
	header.className =
		"hidden md:grid md:grid-cols-5 gap-4 font-bold p-4 bg-cat-surface1/20 border-b border-cat-surface1 text-cat-text items-center";
	header.innerHTML =
		"<div>タイトル</div><div>会社</div><div>勤務地</div><div>締切</div><div>操作</div>";
	container.innerHTML = "";
	container.appendChild(header);
	state.jobs.forEach((job) => {
		const row = document.createElement("div");
		row.className =
			"grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 p-4 border-b border-cat-surface1 items-start md:items-center hover:bg-cat-surface1/10 transition-colors";
		
		// For mobile, we might want labels or a different layout, but for now let's keep it simple with grid
		row.innerHTML = `
            <div class="font-bold text-cat-text md:font-normal">${job.title}</div>
            <div class="text-cat-subtext0"><span class="md:hidden text-xs text-cat-overlay0 mr-2">会社:</span>${job.company}</div>
            <div class="text-cat-subtext0"><span class="md:hidden text-xs text-cat-overlay0 mr-2">勤務地:</span>${job.location || "-"}</div>
            <div class="text-cat-subtext0"><span class="md:hidden text-xs text-cat-overlay0 mr-2">締切:</span>${formatDate(job.deadline)}</div>
        `;
		
		const actions = document.createElement("div");
		actions.className = "flex gap-2 mt-2 md:mt-0";
		
		const editBtn = document.createElement("button");
		editBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-cat-blue text-cat-base hover:bg-cat-blue/90 transition-colors";
		editBtn.textContent = "編集";
		editBtn.onclick = () => fillJobForm(job);
		
		const delBtn = document.createElement("button");
		delBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-cat-surface1 text-cat-red hover:bg-cat-surface2 transition-colors";
		delBtn.textContent = "削除";
		delBtn.onclick = () => deleteJob(job.id);
		
		actions.append(editBtn, delBtn);
		row.appendChild(actions);
		container.appendChild(row);
	});
}

function fillJobForm(job) {
	const form = document.getElementById("jobForm");
	form.elements.id.value = job.id;
	form.title.value = job.title;
	form.company.value = job.company;
	form.location.value = job.location || "";
	form.salaryMin.value = job.salaryMin || "";
	form.salaryMax.value = job.salaryMax || "";
	form.deadline.value = job.deadline ? job.deadline.substring(0, 10) : "";
	form.description.value = job.description || "";
}

async function deleteJob(id) {
	if (!confirm("削除してよいですか？")) return;
	try {
		await api(`/api/admin/jobs/${id}`, { method: "DELETE" });
		await loadJobs();
	} catch (e) {
		alert(e.message);
	}
}

document.getElementById("jobForm").addEventListener("submit", async (e) => {
	e.preventDefault();
	const form = e.target;
	const payload = {
		title: form.title.value,
		company: form.company.value,
		location: form.location.value,
		salaryMin: form.salaryMin.value,
		salaryMax: form.salaryMax.value,
		deadline: form.deadline.value,
		description: form.description.value,
	};
	const id = form.elements.id.value;
	try {
		if (id) {
			await api(`/api/admin/jobs/${id}`, {
				method: "PUT",
				body: JSON.stringify(payload),
			});
		} else {
			await api("/api/admin/jobs", {
				method: "POST",
				body: JSON.stringify(payload),
			});
		}
		form.reset();
		document.getElementById("jobFormMsg").textContent = "保存しました";
		await loadJobs();
	} catch (err) {
		document.getElementById("jobFormMsg").textContent = err.message;
	}
});

document.getElementById("resetJobForm").addEventListener("click", () => {
	const form = document.getElementById("jobForm");
	form.reset();
	form.elements.id.value = "";
});

logoutBtn.addEventListener("click", async () => {
	await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
	window.location.href = "/login";
});

(async function init() {
	await fetchMe();
	await loadJobs();
})();
