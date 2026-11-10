import { Empresa, Empregado, FolhaEmpregado, CompetenciaFolha, LancamentoVariavel, PeriodoFerias, RescisaoSimulada, ContratoDocumento, Afastamento, ItemAgendaObrigacao, ESocialEvento, MovimentacaoMensalEmpresa } from '../types/dp';

export const api = {
  async getStatus() {
    const res = await fetch('/api/status');
    return res.json();
  },

  async getEmpresas(): Promise<Empresa[]> {
    const res = await fetch('/api/empresas');
    return res.json();
  },

  async salvarEmpresa(empresa: Partial<Empresa>): Promise<Empresa> {
    const method = empresa.id ? 'PUT' : 'POST';
    const url = empresa.id ? `/api/empresas/${empresa.id}` : '/api/empresas';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empresa),
    });
    return res.json();
  },

  async getEmpregados(empresaId?: string): Promise<Empregado[]> {
    const url = empresaId ? `/api/empregados?empresaId=${empresaId}` : '/api/empregados';
    const res = await fetch(url);
    return res.json();
  },

  async salvarEmpregado(empregado: Partial<Empregado>): Promise<Empregado> {
    const method = empregado.id ? 'PUT' : 'POST';
    const url = empregado.id ? `/api/empregados/${empregado.id}` : '/api/empregados';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empregado),
    });
    return res.json();
  },

  async registrarAlteracaoEmpregado(id: string, dados: { tipo: string; valorNovo: any; dataVigencia: string; motivo: string; responsavel: string }) {
    const res = await fetch(`/api/empregados/${id}/alteracao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    return res.json();
  },

  async aprovarAdmissao(id: string) {
    const res = await fetch(`/api/empregados/${id}/aprovar-admissao`, {
      method: 'POST',
    });
    return res.json();
  },

  async getFolha(empresaId: string, competencia: string): Promise<{ competencia: CompetenciaFolha; folhas: FolhaEmpregado[] }> {
    const res = await fetch(`/api/folha/${empresaId}/${encodeURIComponent(competencia)}`);
    return res.json();
  },

  async calcularFolha(dados: { empresaId: string; competencia: string; empregadoId?: string; tipoFolha?: string }) {
    const res = await fetch('/api/folha/calcular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao calcular folha');
    }
    return res.json();
  },

  async aprovarFecharCompetencia(dados: { empresaId: string; competencia: string; usuario?: string }) {
    const res = await fetch('/api/folha/aprovar-fechar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao fechar folha');
    }
    return res.json();
  },

  async reabrirCompetencia(dados: { empresaId: string; competencia: string; motivo: string; usuario?: string }) {
    const res = await fetch('/api/folha/reabrir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao reabrir folha');
    }
    return res.json();
  },

  async atualizarStatusCompetencia(dados: { empresaId: string; competencia: string; status: 'ABERTA' | 'EM_CONFERENCIA' | 'APROVADA' | 'FECHADA'; usuario?: string }) {
    const res = await fetch('/api/folha/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao atualizar status da competência');
    }
    return res.json();
  },

  async getAuditoriaComparativa(empresaId: string, competencia: string) {
    const res = await fetch(`/api/folha/auditoria-comparativa/${empresaId}/${encodeURIComponent(competencia)}`);
    return res.json();
  },

  async importarPlanilha(dados: { nomeArquivo: string; competencia: string; linhas: any[] }) {
    const res = await fetch('/api/importar-planilha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao importar planilha');
    }
    return res.json();
  },

  async getLancamentos(competencia?: string, empregadoId?: string): Promise<LancamentoVariavel[]> {
    let url = '/api/lancamentos-variaveis?';
    if (competencia) url += `competencia=${encodeURIComponent(competencia)}&`;
    if (empregadoId) url += `empregadoId=${empregadoId}`;
    const res = await fetch(url);
    return res.json();
  },

  async salvarLancamento(lancamento: Partial<LancamentoVariavel>) {
    const res = await fetch('/api/lancamentos-variaveis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lancamento),
    });
    return res.json();
  },

  async getFerias(empresaId: string): Promise<PeriodoFerias[]> {
    const res = await fetch(`/api/ferias/${empresaId}`);
    return res.json();
  },

  async programarFerias(dados: { empregadoId: string; dataInicio: string; diasGozo: number; abonoPecuniario: boolean; adiantamento13: boolean }) {
    const res = await fetch('/api/ferias/programar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    return res.json();
  },

  async simularRescisao(dados: { empregadoId: string; motivo: string; dataDesligamento: string; tipoAviso: string; saldoFGTSComprovado?: number; adiantamentoPago?: number }): Promise<RescisaoSimulada> {
    const res = await fetch('/api/rescisao/simular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    return res.json();
  },

  async confirmarRescisao(rescisao: RescisaoSimulada) {
    const res = await fetch('/api/rescisao/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rescisao),
    });
    return res.json();
  },

  async getDocumentos(empresaId: string): Promise<ContratoDocumento[]> {
    const res = await fetch(`/api/documentos/${empresaId}`);
    return res.json();
  },

  async atualizarStatusDocumento(dados: { documentoId: string; status: string; dataPagamento?: string; dataAssinatura?: string; assinanteNome?: string; comprovanteAnexo?: string }) {
    const res = await fetch('/api/documentos/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    return res.json();
  },

  async getMovimentacoes(empresaId: string, competencia: string): Promise<MovimentacaoMensalEmpresa[]> {
    const res = await fetch(`/api/movimentacoes/${empresaId}/${encodeURIComponent(competencia)}`);
    return res.json();
  },

  async enviarMovimentacao(dados: Partial<MovimentacaoMensalEmpresa>) {
    const res = await fetch('/api/movimentacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    return res.json();
  },

  async getAgenda(empresaId: string): Promise<ItemAgendaObrigacao[]> {
    const res = await fetch(`/api/agenda/${empresaId}`);
    return res.json();
  },

  async getAfastamentos(empresaId: string): Promise<Afastamento[]> {
    const res = await fetch(`/api/afastamentos/${empresaId}`);
    return res.json();
  },

  async salvarAfastamento(dados: Partial<Afastamento>) {
    const res = await fetch('/api/afastamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    return res.json();
  },

  async getESocial(empresaId: string): Promise<ESocialEvento[]> {
    const res = await fetch(`/api/esocial/${empresaId}`);
    return res.json();
  },

  async transmitirESocial(eventoId: string) {
    const res = await fetch('/api/esocial/transmitir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoId }),
    });
    return res.json();
  },

  async consultarIA(pergunta: string, contexto?: any): Promise<{ resposta: string }> {
    const res = await fetch('/api/ai/consultar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta, contexto }),
    });
    return res.json();
  },
};
