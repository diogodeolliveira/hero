'use strict';

// ===== Save na nuvem (Supabase) =====
// Todo jogador ganha uma conta anônima automática. Para não perder o progresso
// (ou jogar em outro aparelho), ele pode vincular um e-mail.
const Nuvem = (function () {
  let cliente = null;
  let usuario = null;
  let timer = null;
  let estado = 'desligado';
  const TEXTO = {
    desligado: 'Save só neste aparelho',
    conectando: 'Conectando à nuvem…',
    ok: 'Salvo na nuvem',
    salvando: 'Salvando na nuvem…',
    erro: 'Sem conexão com a nuvem (salvo neste aparelho)',
  };

  function setEstado(e) {
    estado = e;
    const el = document.getElementById('status-nuvem');
    if (el) { el.textContent = TEXTO[e]; el.dataset.estado = e; }
  }
  function configurada() { return !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && window.supabase); }

  async function baixar() {
    const { data, error } = await cliente.from('saves').select('dados').eq('user_id', usuario.id).maybeSingle();
    if (error) throw error;
    return data ? data.dados : null;
  }

  async function iniciar(aoTrocarConta) {
    if (!configurada()) return null;
    cliente = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    setEstado('conectando');
    try {
      let { data: { session } } = await cliente.auth.getSession();
      if (!session) {
        const { data, error } = await cliente.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      usuario = session.user;
      // Entrou por link de e-mail em outra conta: carrega o save dela
      cliente.auth.onAuthStateChange((evento, s) => {
        if (!s) return;
        const trocou = !usuario || s.user.id !== usuario.id;
        usuario = s.user;
        if (trocou) baixar().then(aoTrocarConta).catch(() => setEstado('erro'));
      });
      const remoto = await baixar();
      setEstado('ok');
      return remoto;
    } catch (e) {
      console.warn('Nuvem:', e);
      setEstado('erro');
      return null;
    }
  }

  function agendar() {
    if (!usuario) return;
    clearTimeout(timer);
    timer = setTimeout(enviar, 1500);
  }
  async function enviar() {
    if (!usuario || !S) return;
    setEstado('salvando');
    const { error } = await cliente.from('saves').upsert({
      user_id: usuario.id, dados: S, versao: S.v, atualizado_em: new Date().toISOString(),
    });
    setEstado(error ? 'erro' : 'ok');
  }
  async function apagar() {
    if (!usuario) return;
    clearTimeout(timer);
    await cliente.from('saves').delete().eq('user_id', usuario.id);
  }

  // Transforma a conta anônima em conta com e-mail (o progresso continua o mesmo)
  async function protegerComEmail(email) {
    const { error } = await cliente.auth.updateUser({ email }, { emailRedirectTo: location.origin + location.pathname });
    if (error) throw error;
  }
  // Entra numa conta que já tem e-mail (ex.: outro aparelho)
  async function entrarComEmail(email) {
    const { error } = await cliente.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error;
  }
  async function sair() {
    await cliente.auth.signOut();
    usuario = null;
  }

  return {
    iniciar, agendar, enviar, apagar, protegerComEmail, entrarComEmail, sair, configurada,
    get estado() { return estado; },
    get texto() { return TEXTO[estado]; },
    get usuario() { return usuario; },
  };
})();
