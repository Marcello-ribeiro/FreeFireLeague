const supabaseUrl = "https://hvmnjqznvqjkpkjyxsul.supabase.co";
const supabaseKey = "sb_publishable_1jVPP9Hfm_XvcScHjqOiVA_LMGRqoNa";

const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let todasPartidas = [];

function abrirModal({ title, text, input = false, confirmText = "Confirmar" }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("modalOverlay");
    const modalTitle = document.getElementById("modalTitle");
    const modalText = document.getElementById("modalText");
    const modalInput = document.getElementById("modalInput");
    const confirmBtn = document.getElementById("modalConfirm");
    const cancelBtn = document.getElementById("modalCancel");

    if (!overlay) {
      resolve(window.confirm(text));
      return;
    }

    modalTitle.innerText = title;
    modalText.innerText = text;
    confirmBtn.innerText = confirmText;

    modalInput.value = "";
    modalInput.classList.toggle("hidden", !input);

    overlay.classList.remove("hidden");

    confirmBtn.onclick = () => {
      overlay.classList.add("hidden");
      resolve(input ? modalInput.value : true);
    };

    cancelBtn.onclick = () => {
      overlay.classList.add("hidden");
      resolve(false);
    };
  });
}

async function avisoBonito(title, text) {
  await abrirModal({
    title,
    text,
    confirmText: "OK"
  });
}

async function login(event) {
  if (event) event.preventDefault();

  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();

  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .eq("role", "admin")
    .single();

  if (error || !data) {
    document.getElementById("loginMsg").innerText = "Admin ou senha errado.";
    return;
  }

  localStorage.setItem("ff_admin", "true");
  window.location.href = "admin.html";
}

function logout() {
  localStorage.removeItem("ff_admin");
  window.location.href = "admin-login.html";
}

async function carregarRanking() {
  const ranking = document.getElementById("ranking");
  if (!ranking) return;

  const adminLogado = localStorage.getItem("ff_admin") === "true";

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

  const totalPlayers = document.getElementById("totalPlayers");
  if (totalPlayers) totalPlayers.innerText = data.length;

  ranking.innerHTML = data.map((p, i) => `
    <div class="player ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}">
      <div class="player-left">
        <div class="avatar">
          <img src="${p.avatar || "https://i.imgur.com/4Z7Dz7S.png"}" alt="${p.username}">
        </div>

        <div>
          <strong>
            #${i + 1}
            ${p.platform === "Mobile" ? "📱" : "🖥️"}
            ${p.username}
          </strong>

          <div class="stats">
            <span class="stat points">🏆 ${p.points} pts</span>
            <span class="stat wins">✅ ${p.wins} V</span>
            <span class="stat losses">❌ ${p.losses} D</span>
          </div>
        </div>
      </div>
 
      ${adminLogado ? `
        <div class="admin-actions">
<button onclick="editarJogador('${p.id}', '${p.username}')">
  Editar nome
</button>

<button onclick="editarAvatar('${p.id}')">
  Editar foto
</button>

  <button class="danger-btn" onclick="apagarJogador('${p.id}')">
    Apagar
  </button>
</div>
      ` : ""}
    </div>
  `).join("");
}

function filtrarJogadores() {
  const input = document.getElementById("buscarJogador");
  const filtro = input.value.toLowerCase();

  const jogadores = document.querySelectorAll("#listaJogadores tr");

  jogadores.forEach((jogador) => {
    const texto = jogador.innerText.toLowerCase();

    if (texto.includes(filtro)) {
      jogador.style.display = "";
    } else {
      jogador.style.display = "none";
    }
  });
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
      <span class="pending">PENDENTE</span>
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

  todasPartidas = data || [];
  renderizarConfrontos(todasPartidas);
}

function renderizarConfrontos(data) {
  const matches = document.getElementById("matches");
  if (!matches) return;

  const pendentes = data.filter(m => m.status !== "finished").length;
  const finalizados = data.filter(m => m.status === "finished").length;

  const totalPending = document.getElementById("totalPending");
  const totalFinished = document.getElementById("totalFinished");

  if (totalPending) totalPending.innerText = pendentes;
  if (totalFinished) totalFinished.innerText = finalizados;

  matches.innerHTML = `
    <div class="match-counter">
      <span class="pending">Pendentes: ${pendentes}</span>
      <span class="finished">Finalizadas: ${finalizados}</span>
    </div>
    ${data.map(montarConfrontoPublico).join("")}
  `;
}

function filtrarPartidas() {
  const input = document.getElementById("searchPlayer");
  if (!input) return;

  const nome = input.value.trim().toLowerCase();

  const filtradas = todasPartidas.filter(m =>
    m.player1.toLowerCase().includes(nome) ||
    m.player2.toLowerCase().includes(nome)
  );

  renderizarConfrontos(filtradas);
}

function limparFiltro() {
  const input = document.getElementById("searchPlayer");
  if (input) input.value = "";

  renderizarConfrontos(todasPartidas);
}

async function criarJogador() {
  const username = document.getElementById("newUser").value.trim();
  const passwordInput = document.getElementById("newPass");
  const password = passwordInput ? passwordInput.value.trim() : "123456";
  const platform = document.getElementById("newPlatform").value;
  const avatar = document.getElementById("newAvatar").value.trim();

  if (!username) {
    await avisoBonito("Dados incompletos", "Preencha o nome do jogador.");
    return;
  }

 const { data: novoJogador, error } = await db.from("users").insert([
  {
    username,
    password: password || "123456",
    platform,
    avatar,
    role: "player"
  }
]).select().single();

  if (error) {
    await avisoBonito("Erro", error.message);
    return;
  }

  await gerarConfrontosDoNovoJogador(novoJogador);

  document.getElementById("newUser").value = "";
  if (passwordInput) passwordInput.value = "";

  carregarRanking();
  await avisoBonito("Jogador criado", "O jogador foi criado com sucesso.");
}

async function gerarConfrontosDoNovoJogador(novoJogador) {
  const { data: players, error } = await db
    .from("users")
    .select("*")
    .eq("role", "player")
    .neq("id", novoJogador.id);

  if (error || !players || players.length === 0) return;

  const confrontos = players.map(player => ({
    player1_id: novoJogador.id,
    player2_id: player.id,
    player1: novoJogador.username,
    player2: player.username,
    status: "pending"
  }));

  const { error: insertError } = await db
    .from("matches")
    .insert(confrontos);

  if (insertError) {
    await avisoBonito("Erro", insertError.message);
  }
}

async function gerarConfrontos() {
  const { data: existing } = await db.from("matches").select("id");

  if (existing && existing.length > 0) {
    const ok = await abrirModal({
      title: "Confrontos existentes",
      text: "Já existem confrontos. Gerar de novo pode duplicar partidas. Continuar?",
      confirmText: "Gerar mesmo assim"
    });

    if (!ok) return;
  }

  const { data: players, error } = await db
    .from("users")
    .select("*")
    .eq("role", "player");

  if (error || !players || players.length < 2) {
    await avisoBonito("Poucos jogadores", "Precisa ter pelo menos 2 jogadores.");
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
    await avisoBonito("Erro", insertError.message);
    return;
  }

  carregarConfrontosAdmin();
  carregarConfrontos();

  await avisoBonito("Confrontos gerados", "Todos os confrontos foram criados.");
}

async function apagarJogador(id) {
  const ok = await abrirModal({
    title: "Apagar jogador",
    text: "Isso também apagará todos os confrontos desse jogador.",
    confirmText: "Apagar"
  });

  if (!ok) return;

  await db.from("matches").delete().or(`player1_id.eq.${id},player2_id.eq.${id}`);
  await db.from("users").delete().eq("id", id);

  carregarRanking();
  carregarConfrontosAdmin();
  carregarConfrontos();

  await avisoBonito("Jogador apagado", "Jogador e confrontos relacionados foram apagados.");
}

let todosConfrontosAdmin = [];

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

  todosConfrontosAdmin = data || [];
  renderizarConfrontosAdmin(todosConfrontosAdmin);
}

function renderizarConfrontosAdmin(data) {
  const box = document.getElementById("adminMatches");
  if (!box) return;

  const pendentes = data.filter(m => m.status !== "finished").length;
  const finalizados = data.filter(m => m.status === "finished").length;

  box.innerHTML = `
    <input
      type="text"
      id="buscarConfrontoAdmin"
      placeholder="Pesquisar jogador no confronto..."
      onkeyup="filtrarConfrontosAdmin()"
      style="
        width: 100%;
        padding: 12px;
        margin: 12px 0;
        border-radius: 10px;
        border: none;
        font-size: 16px;
      "
    >

    <div class="match-counter">
      <span class="pending">Pendentes: ${pendentes}</span>
      <span class="finished">Finalizadas: ${finalizados}</span>
    </div>

    ${data.map(m => `
      <div class="match ${m.status === "finished" ? "finished-card" : "pending-card"} admin-match">
        <strong>
          ${m.status === "finished"
            ? `<span class="winner">${m.winner}</span> venceu <span class="loser">${m.player1 === m.winner ? m.player2 : m.player1}</span>`
            : `${m.player1} x ${m.player2}`
          }
        </strong>

      <select id="winner-${m.id}">
  <option value="reset">Ninguém venceu ainda</option>
  <option value="${m.player1_id}|${m.player1}|${m.player2_id}|${m.player2}">${m.player1}</option>
  <option value="${m.player2_id}|${m.player2}|${m.player1_id}|${m.player1}">${m.player2}</option>
</select>

        <select id="score-${m.id}">
          <option value="2x0">2x0</option>
          <option value="2x1">2x1</option>
        </select>

        <button onclick="salvarResultado('${m.id}')">
          ${m.status === "finished" ? "Editar resultado" : "Salvar resultado"}
        </button>

        <span class="${m.status === "finished" ? "finished" : "pending"}">
          ${m.status === "finished" ? `${m.score} • FINALIZADO` : "PENDENTE"}
        </span>
      </div>
    `).join("")}
  `;
}

function filtrarConfrontosAdmin() {
  const input = document.getElementById("buscarConfrontoAdmin");
  if (!input) return;

  const busca = input.value.trim().toLowerCase();

  const filtrados = todosConfrontosAdmin.filter(m =>
    m.player1.toLowerCase().includes(busca) ||
    m.player2.toLowerCase().includes(busca) ||
    (m.winner && m.winner.toLowerCase().includes(busca))
  );

  renderizarConfrontosAdmin(filtrados);

  const novoInput = document.getElementById("buscarConfrontoAdmin");
  if (novoInput) {
    novoInput.value = busca;
    novoInput.focus();
  }
}

async function salvarResultado(matchId) {
  const winnerValue = document.getElementById(`winner-${matchId}`).value;
  const score = document.getElementById(`score-${matchId}`).value;

  if (winnerValue === "reset") {
  const { data: oldMatch } = await db
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (oldMatch.status === "finished") {
    await db.rpc("increment_user_points", {
      user_id_input: oldMatch.winner_id,
      points_input: -oldMatch.winner_points,
      win_input: -1,
      loss_input: 0
    });

    await db.rpc("increment_user_points", {
      user_id_input: oldMatch.loser_id,
      points_input: -oldMatch.loser_points,
      win_input: 0,
      loss_input: -1
    });
  }

  await db.from("matches").update({
    winner_id: null,
    loser_id: null,
    winner: null,
    score: null,
    winner_points: 0,
    loser_points: 0,
    status: "pending"
  }).eq("id", matchId);

  carregarRanking();
  carregarConfrontos();
  carregarConfrontosAdmin();

  await avisoBonito("Resultado revertido", "A partida voltou para pendente.");
  return;
}

  if (!winnerValue) {
    await avisoBonito("Resultado incompleto", "Escolha o vencedor.");
    return;
  }

  const { data: oldMatch } = await db
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  const [winnerId, winnerName, loserId] = winnerValue.split("|");

  const winnerPoints = score === "2x0" ? 3 : 2;
  const loserPoints = score === "2x0" ? 0 : 1;

  if (oldMatch.status === "finished") {
    const ok = await abrirModal({
      title: "Editar resultado",
      text: "Esse confronto já estava finalizado. O sistema vai remover os pontos antigos e aplicar os novos.",
      confirmText: "Editar"
    });

    if (!ok) return;

    await db.rpc("increment_user_points", {
      user_id_input: oldMatch.winner_id,
      points_input: -oldMatch.winner_points,
      win_input: -1,
      loss_input: 0
    });

    await db.rpc("increment_user_points", {
      user_id_input: oldMatch.loser_id,
      points_input: -oldMatch.loser_points,
      win_input: 0,
      loss_input: -1
    });
  }

  const { error } = await db.from("matches").update({
    winner_id: winnerId,
    loser_id: loserId,
    winner: winnerName,
    score,
    winner_points: winnerPoints,
    loser_points: loserPoints,
    status: "finished"
  }).eq("id", matchId);

  if (error) {
    await avisoBonito("Erro", error.message);
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

  await avisoBonito("Resultado salvo", "O ranking foi atualizado automaticamente.");
}

async function resetarResultados() {
  const ok = await abrirModal({
    title: "Resetar resultados",
    text: "Isso vai apagar todos os resultados e zerar o ranking, mas manter jogadores e confrontos.",
    confirmText: "Resetar"
  });

  if (!ok) return;

  await db.from("matches").update({
    winner_id: null,
    loser_id: null,
    winner: null,
    score: null,
    winner_points: 0,
    loser_points: 0,
    status: "pending"
  }).neq("id", "00000000-0000-0000-0000-000000000000");

  await db.from("users").update({
    points: 0,
    wins: 0,
    losses: 0
  }).eq("role", "player");

  carregarRanking();
  carregarConfrontos();
  carregarConfrontosAdmin();

  await avisoBonito("Reset concluído", "Resultados e ranking foram resetados.");
}

async function apagarConfrontos() {
  const ok = await abrirModal({
    title: "Apagar confrontos",
    text: "Isso apagará todos os confrontos e também zerará o ranking.",
    confirmText: "Apagar confrontos"
  });

  if (!ok) return;

  await db.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  await db.from("users").update({
    points: 0,
    wins: 0,
    losses: 0
  }).eq("role", "player");

  carregarRanking();
  carregarConfrontos();
  carregarConfrontosAdmin();

  await avisoBonito("Confrontos apagados", "Todos os confrontos foram apagados.");
}

async function apagarTudo() {
  const resposta = await abrirModal({
    title: "Apagar tudo",
    text: "Digite RESET para apagar jogadores e confrontos. O admin será mantido.",
    input: true,
    confirmText: "Apagar tudo"
  });

  if (resposta !== "RESET") {
    await avisoBonito("Cancelado", "A confirmação estava incorreta.");
    return;
  }

  await db.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("users").delete().eq("role", "player");

  carregarRanking();
  carregarConfrontos();
  carregarConfrontosAdmin();

  await avisoBonito("Tudo apagado", "Jogadores e confrontos foram apagados.");
}

async function editarJogador(id, usernameAtual) {
  const novoNome = await abrirModal({
    title: "Editar nome",
    text: "Digite o novo nome do jogador.",
    input: true,
    confirmText: "Salvar"
  });

  if (novoNome === false) return;

  const nomeFinal = novoNome || usernameAtual;

  const { error } = await db
    .from("users")
    .update({
      username: nomeFinal
    })
    .eq("id", id);

  if (error) {
    await avisoBonito("Erro", error.message);
    return;
  }

  await db
    .from("matches")
    .update({ player1: nomeFinal })
    .eq("player1_id", id);

  await db
    .from("matches")
    .update({ player2: nomeFinal })
    .eq("player2_id", id);

  await avisoBonito("Sucesso", "Nome atualizado.");

  carregarRanking();
  carregarConfrontos();
  carregarConfrontosAdmin();
}

async function editarAvatar(id) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async () => {
    const file = input.files[0];

    if (!file) return;

    const extensao = file.name.split(".").pop();
    const nomeArquivo = `avatar-${id}-${Date.now()}.${extensao}`;

    const { error: uploadError } = await db.storage
      .from("avatars")
      .upload(nomeArquivo, file, {
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) {
      await avisoBonito("Erro no upload", uploadError.message);
      return;
    }

    const { data } = db.storage
      .from("avatars")
      .getPublicUrl(nomeArquivo);

    const avatarUrl = data.publicUrl;

    const { error } = await db
      .from("users")
      .update({ avatar: avatarUrl })
      .eq("id", id);

    if (error) {
      await avisoBonito("Erro", error.message);
      return;
    }

    carregarRanking();

    await avisoBonito("Foto atualizada", "Avatar atualizado com sucesso.");
  };

  input.click();
}

const pagina = location.pathname;

if (pagina.includes("admin.html")) {
  const adminLogado = localStorage.getItem("ff_admin");

  if (adminLogado !== "true") {
    window.location.href = "admin-login.html";
  } else {
    carregarRanking();
    carregarConfrontosAdmin();
  }
} else {
  carregarRanking();
  carregarConfrontos();
}