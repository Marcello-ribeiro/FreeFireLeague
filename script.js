const supabaseUrl = "https://hvmnjqznvqjkpkjyxsul.supabase.co";
const supabaseKey = "sb_publishable_1jVPP9Hfm_XvcScHjqOiVA_LMGRqoNa";

const db = window.supabase.createClient(supabaseUrl, supabaseKey);

async function login(event) {
  if (event) event.preventDefault();

  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();

  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .single();

  if (error || !data) {
    document.getElementById("loginMsg").innerText = "Usuário ou senha errado.";
    return;
  }

  localStorage.setItem("ff_user", JSON.stringify(data));

  window.location.href = data.role === "admin" ? "admin.html" : "index.html";
}

function protegerPagina() {
  const user = JSON.parse(localStorage.getItem("ff_user"));

  if (!user && !location.pathname.includes("login.html")) {
    window.location.href = "login.html";
    return null;
  }

  return user;
}

function logout() {
  localStorage.removeItem("ff_user");
  window.location.href = "login.html";
}

async function carregarRanking() {
  const ranking = document.getElementById("ranking");
  if (!ranking) return;

  const user = JSON.parse(localStorage.getItem("ff_user"));

  const { data, error } = await db
    .from("users")
    .select("*")
    .neq("role", "admin")
    .order("points", { ascending: false })
    .order("wins", { ascending: false });

  if (error) {
    ranking.innerHTML = "<p>Erro ao carregar ranking.</p>";
    return;
  }

  ranking.innerHTML = data.map((p, i) => `
    <div class="player">
      <div>
        <strong>#${i + 1} ${p.platform === "Mobile" ? "📱" : "🖥️"} ${p.username}</strong>
      </div>

      <span>${p.points} pts | V: ${p.wins} | D: ${p.losses}</span>

      ${user?.role === "admin" ? `
        <button class="danger-btn" onclick="apagarJogador('${p.id}')">
          Apagar
        </button>
      ` : ""}
    </div>
  `).join("");
}

function montarConfrontoPublico(m) {
  if (m.status === "finished") {
    const loserName = m.player1 === m.winner ? m.player2 : m.player1;

    return `
      <div class="match finished-card">
        <strong>
          <span class="winner">${m.winner}</span>
          <span> venceu </span>
          <span class="loser">${loserName}</span>
        </strong>

        <span class="finished">${m.score} • FINALIZADO</span>
      </div>
    `;
  }

  return `
    <div class="match pending-card">
      <strong>${m.player1} x ${m.player2}</strong>
      <span class="pending">Pendente</span>
    </div>
  `;
}

async function carregarConfrontos() {
  const matches = document.getElementById("matches");
  if (!matches) return;

  const { data, error } = await db
    .from("matches")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    matches.innerHTML = "<p>Erro ao carregar confrontos.</p>";
    return;
  }

  const pendentes = data.filter(m => m.status !== "finished").length;
  const finalizados = data.filter(m => m.status === "finished").length;

  matches.innerHTML = `
    <div class="match-counter">
      <span class="pending">Pendentes: ${pendentes}</span>
      <span class="finished">Finalizadas: ${finalizados}</span>
    </div>
    ${data.map(montarConfrontoPublico).join("")}
  `;
}

async function criarJogador() {
  const username = document.getElementById("newUser").value.trim();
  const password = document.getElementById("newPass").value.trim();
  const platform = document.getElementById("newPlatform").value;

  if (!username || !password) {
    alert("Preencha usuário e senha.");
    return;
  }

  const { error } = await db.from("users").insert([
    { username, password, platform, role: "player" }
  ]);

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("newUser").value = "";
  document.getElementById("newPass").value = "";

  carregarRanking();
}

async function gerarConfrontos() {
  const { data: existing } = await db.from("matches").select("id");

  if (existing && existing.length > 0) {
    if (!confirm("Já existem confrontos. Gerar de novo vai duplicar. Continuar?")) return;
  }

  const { data: players, error } = await db
    .from("users")
    .select("*")
    .eq("role", "player");

  if (error || !players || players.length < 2) {
    alert("Precisa ter pelo menos 2 jogadores.");
    return;
  }

  const confrontos = [];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      confrontos.push({
        player1_id: players[i].id,
        player2_id: players[j].id,
        player1: players[i].username,
        player2: players[j].username,
        status: "pending"
      });
    }
  }

  const { error: insertError } = await db.from("matches").insert(confrontos);

  if (insertError) {
    alert(insertError.message);
    return;
  }

  carregarConfrontosAdmin();
  carregarConfrontos();
}

async function apagarJogador(id) {
  if (!confirm("Apagar jogador? Isso também apaga os confrontos dele.")) return;

  await db.from("matches").delete().or(`player1_id.eq.${id},player2_id.eq.${id}`);
  await db.from("users").delete().eq("id", id);

  carregarRanking();
  carregarConfrontosAdmin();
  carregarConfrontos();
}

async function carregarConfrontosAdmin() {
  const box = document.getElementById("adminMatches");
  if (!box) return;

  const { data, error } = await db
    .from("matches")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    box.innerHTML = "<p>Erro ao carregar confrontos.</p>";
    return;
  }

  const pendentes = data.filter(m => m.status !== "finished").length;
  const finalizados = data.filter(m => m.status === "finished").length;

  box.innerHTML = `
    <div class="match-counter">
      <span class="pending">Pendentes: ${pendentes}</span>
      <span class="finished">Finalizadas: ${finalizados}</span>
    </div>

    ${data.map(m => {
      if (m.status === "finished") {
        const loserName = m.player1 === m.winner ? m.player2 : m.player1;

        return `
          <div class="match finished-card admin-match">
            <strong>
              <span class="winner">${m.winner}</span>
              venceu
              <span class="loser">${loserName}</span>
            </strong>

            <span class="finished">${m.score} • FINALIZADO</span>
          </div>
        `;
      }

      return `
        <div class="match pending-card admin-match">
          <strong>${m.player1} x ${m.player2}</strong>

          <select id="winner-${m.id}">
            <option value="">Vencedor</option>
            <option value="${m.player1_id}|${m.player1}|${m.player2_id}|${m.player2}">
              ${m.player1}
            </option>
            <option value="${m.player2_id}|${m.player2}|${m.player1_id}|${m.player1}">
              ${m.player2}
            </option>
          </select>

          <select id="score-${m.id}">
            <option value="2x0">2x0</option>
            <option value="2x1">2x1</option>
          </select>

          <button onclick="salvarResultado('${m.id}')">Salvar resultado</button>

          <span class="pending">Pendente</span>
        </div>
      `;
    }).join("")}
  `;
}

async function salvarResultado(matchId) {
  const winnerValue = document.getElementById(`winner-${matchId}`).value;
  const score = document.getElementById(`score-${matchId}`).value;

  if (!winnerValue) {
    alert("Escolha o vencedor.");
    return;
  }

  const [winnerId, winnerName, loserId, loserName] = winnerValue.split("|");

  const winnerPoints = score === "2x0" ? 3 : 2;
  const loserPoints = score === "2x0" ? 0 : 1;

  const { error } = await db
    .from("matches")
    .update({
      winner_id: winnerId,
      loser_id: loserId,
      winner: winnerName,
      score,
      winner_points: winnerPoints,
      loser_points: loserPoints,
      status: "finished"
    })
    .eq("id", matchId);

  if (error) {
    alert(error.message);
    return;
  }

  await db.rpc("increment_user_points", {
    user_id_input: winnerId,
    points_input: winnerPoints,
    win_input: 1,
    loss_input: 0
  });

  await db.rpc("increment_user_points", {
    user_id_input: loserId,
    points_input: loserPoints,
    win_input: 0,
    loss_input: 1
  });

  carregarRanking();
  carregarConfrontosAdmin();
  carregarConfrontos();
}

const user = protegerPagina();

if (user) {
  if (location.pathname.includes("admin.html") && user.role !== "admin") {
    window.location.href = "index.html";
  } else {
    carregarRanking();
    carregarConfrontos();
    carregarConfrontosAdmin();
  }
}