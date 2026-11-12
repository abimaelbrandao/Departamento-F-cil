import React, { useState } from 'react';
import { Empresa } from '../types/dp';
import { api } from '../services/api';
import { formatarCNPJ, formatarCEP, validarCNPJ } from '../utils/formatters';
import {
  Building2,
  X,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  PowerOff,
  Power,
  ArrowRight,
  ShieldAlert,
  FileSpreadsheet,
  Users,
  Settings,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresas: Empresa[];
  empresaAtivaId: string;
  onSelecionarEmpresa: (empresaId: string) => void;
  onEmpresasAtualizadas: () => void;
  abrirCadastroDireto?: boolean;
  onSolicitarCriarColaborador?: (empresa: Empresa) => void;
  onSolicitarCriarCompetencia?: (empresa: Empresa) => void;
}

export const CompanyManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresas,
  empresaAtivaId,
  onSelecionarEmpresa,
  onEmpresasAtualizadas,
  abrirCadastroDireto = false,
  onSolicitarCriarColaborador,
  onSolicitarCriarCompetencia,
}) => {
  const [modo, setModo] = useState<'LISTA' | 'FORM'>(abrirCadastroDireto || empresas.length === 0 ? 'FORM' : 'LISTA');
  const [empresaEmEdicao, setEmpresaEmEdicao] = useState<Partial<Empresa> | null>(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODAS' | 'ATIVAS' | 'INATIVAS'>('TODAS');
  const [salvando, setSalvando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [empresaCriadaSucesso, setEmpresaCriadaSucesso] = useState<Empresa | null>(null);
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false);
  const [avisoCNPJ, setAvisoCNPJ] = useState<string | null>(null);

  // Modal de confirmação de exclusão
  const [empresaParaExcluir, setEmpresaParaExcluir] = useState<Empresa | null>(null);
  const [erroExclusao, setErroExclusao] = useState<{
    mensagem: string;
    vinculos?: any;
    podeInativar?: boolean;
  } | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Formulário de Empresa
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('ISENTO');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [cnaePrincipal, setCnaePrincipal] = useState('6201-5/01');
  const [regimeTributario, setRegimeTributario] = useState<'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL'>('SIMPLES_NACIONAL');
  const [fpas, setFpas] = useState('507');
  const [aliquotaRat, setAliquotaRat] = useState(2.0);
  const [fap, setFap] = useState(1.0);
  const [aliquotaTerceiros, setAliquotaTerceiros] = useState(0);

  // Endereço
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('São Paulo');
  const [uf, setUf] = useState('SP');
  const [cep, setCep] = useState('');

  // Parâmetros de folha
  const [diaPagamentoSalario, setDiaPagamentoSalario] = useState(5);
  const [diaAdiantamento, setDiaAdiantamento] = useState(20);
  const [percentualAdiantamento, setPercentualAdiantamento] = useState(40);
  const [diaVencimentoFGTS, setDiaVencimentoFGTS] = useState(20);
  const [diaVencimentoDCTFWeb, setDiaVencimentoDCTFWeb] = useState(15);

  if (!isOpen) return null;

  const iniciarNovoCadastro = () => {
    setEmpresaEmEdicao(null);
    setRazaoSocial('');
    setNomeFantasia('');
    setCnpj('');
    setInscricaoEstadual('ISENTO');
    setInscricaoMunicipal('');
    setCnaePrincipal('6201-5/01 - Desenvolvimento de programas de computador');
    setRegimeTributario('SIMPLES_NACIONAL');
    setFpas('507');
    setAliquotaRat(2.0);
    setFap(1.0);
    setAliquotaTerceiros(0);
    setLogradouro('');
    setNumero('');
    setBairro('');
    setCidade('São Paulo');
    setUf('SP');
    setCep('');
    setDiaPagamentoSalario(5);
    setDiaAdiantamento(20);
    setPercentualAdiantamento(40);
    setDiaVencimentoFGTS(20);
    setDiaVencimentoDCTFWeb(15);
    setMensagemErro(null);
    setAvisoCNPJ(null);
    setEmpresaCriadaSucesso(null);
    setModo('FORM');
  };

  const iniciarEdicao = (emp: Empresa) => {
    setEmpresaEmEdicao(emp);
    setRazaoSocial(emp.razaoSocial || '');
    setNomeFantasia(emp.nomeFantasia || '');
    setCnpj(formatarCNPJ(emp.cnpj));
    setInscricaoEstadual(emp.inscricaoEstadual || 'ISENTO');
    setInscricaoMunicipal(emp.inscricaoMunicipal || '');
    setCnaePrincipal(emp.cnaePrincipal || '');
    setRegimeTributario(emp.regimeTributario || 'SIMPLES_NACIONAL');
    setFpas(emp.fpas || '507');
    setAliquotaRat(emp.aliquotaRat ?? 2.0);
    setFap(emp.fap ?? 1.0);
    setAliquotaTerceiros(emp.aliquotaTerceiros ?? 0);
    setLogradouro(emp.endereco?.logradouro || '');
    setNumero(emp.endereco?.numero || '');
    setBairro(emp.endereco?.bairro || '');
    setCidade(emp.endereco?.cidade || 'São Paulo');
    setUf(emp.endereco?.uf || 'SP');
    setCep(emp.endereco?.cep || '');
    setDiaPagamentoSalario(emp.configuracoesFolha?.diaPagamentoSalario ?? 5);
    setDiaAdiantamento(emp.configuracoesFolha?.diaAdiantamento ?? 20);
    setPercentualAdiantamento(emp.configuracoesFolha?.percentualAdiantamento ?? 40);
    setDiaVencimentoFGTS(emp.configuracoesFolha?.diaVencimentoFGTS ?? 20);
    setDiaVencimentoDCTFWeb(emp.configuracoesFolha?.diaVencimentoDCTFWeb ?? 15);
    setMensagemErro(null);
    setAvisoCNPJ(null);
    setEmpresaCriadaSucesso(null);
    setModo('FORM');
  };

  const handleConsultarCNPJ = async (cnpjParaConsultar?: string) => {
    const valor = (cnpjParaConsultar || cnpj).replace(/\D/g, '');
    if (valor.length !== 14) {
      setMensagemErro('Informe os 14 dígitos do CNPJ para efetuar a consulta.');
      return;
    }
    if (!validarCNPJ(valor)) {
      setMensagemErro('Os dígitos verificadores do CNPJ informado são inválidos.');
      return;
    }

    setConsultandoCNPJ(true);
    setMensagemErro(null);
    setAvisoCNPJ(null);

    try {
      const dados = await api.consultarCNPJ(valor);
      if (dados.razaoSocial) setRazaoSocial(dados.razaoSocial);
      if (dados.nomeFantasia) setNomeFantasia(dados.nomeFantasia);
      if (dados.cnaePrincipal) setCnaePrincipal(dados.cnaePrincipal);
      if (dados.logradouro) setLogradouro(dados.logradouro);
      if (dados.numero) setNumero(dados.numero);
      if (dados.bairro) setBairro(dados.bairro);
      if (dados.cidade) setCidade(dados.cidade);
      if (dados.uf) setUf(dados.uf);
      if (dados.cep) setCep(dados.cep);
      if (dados.regimeTributario) setRegimeTributario(dados.regimeTributario);

      setAvisoCNPJ('Dados cadastrais da empresa localizados e preenchidos automaticamente.');
    } catch (err: any) {
      // Falha não-bloqueante na consulta: informa o operador e mantém os dados já digitados para preenchimento manual
      setAvisoCNPJ(
        'Consulta automática de CNPJ indisponível no momento. Você pode prosseguir preenchendo os campos manualmente.'
      );
    } finally {
      setConsultandoCNPJ(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);
    setAvisoCNPJ(null);

    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (!razaoSocial.trim()) {
      setMensagemErro('Razão Social é obrigatória.');
      return;
    }
    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      setMensagemErro('CNPJ deve conter 14 dígitos numéricos.');
      return;
    }
    if (!validarCNPJ(cnpjLimpo)) {
      setMensagemErro('Os dígitos verificadores do CNPJ informado são inválidos.');
      return;
    }

    // Prevenção de duplicidade: não permite salvar se o CNPJ já pertencer a outra empresa
    const jaCadastrada = empresas.some(
      e => e.id !== empresaEmEdicao?.id && e.cnpj.replace(/\D/g, '') === cnpjLimpo
    );
    if (jaCadastrada) {
      setMensagemErro('Já existe outra empresa cadastrada com este CNPJ no sistema.');
      return;
    }

    try {
      setSalvando(true);
      const payload: Partial<Empresa> = {
        id: empresaEmEdicao?.id,
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: (nomeFantasia || razaoSocial).trim(),
        cnpj: cnpjLimpo,
        inscricaoEstadual: inscricaoEstadual || 'ISENTO',
        inscricaoMunicipal,
        cnaePrincipal,
        regimeTributario,
        fpas,
        aliquotaRat: Number(aliquotaRat),
        fap: Number(fap),
        aliquotaTerceiros: Number(aliquotaTerceiros),
        endereco: {
          logradouro,
          numero,
          bairro,
          cidade,
          uf,
          cep,
        },
        configuracoesFolha: {
          diaPagamentoSalario: Number(diaPagamentoSalario),
          diaAdiantamento: Number(diaAdiantamento),
          percentualAdiantamento: Number(percentualAdiantamento),
          diaVencimentoFGTS: Number(diaVencimentoFGTS),
          diaVencimentoDCTFWeb: Number(diaVencimentoDCTFWeb),
        },
        status: empresaEmEdicao?.status || 'ativa',
      };

      const salva = await api.salvarEmpresa(payload);
      onEmpresasAtualizadas();
      onSelecionarEmpresa(salva.id);

      if (!empresaEmEdicao) {
        setEmpresaCriadaSucesso(salva);
      } else {
        setModo('LISTA');
      }
    } catch (err: any) {
      // Mantém todos os campos intactos e exibe o erro identificado
      setMensagemErro(err.message || 'Erro ao salvar empresa.');
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleStatus = async (emp: Empresa) => {
    try {
      const novoStatusInativa = emp.status !== 'inativa';
      await api.inativarEmpresa(emp.id, novoStatusInativa);
      onEmpresasAtualizadas();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status da empresa');
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!empresaParaExcluir) return;
    try {
      setExcluindo(true);
      setErroExclusao(null);
      await api.excluirEmpresa(empresaParaExcluir.id);
      onEmpresasAtualizadas();
      setEmpresaParaExcluir(null);
    } catch (err: any) {
      setErroExclusao({
        mensagem: err.message,
        vinculos: err.vinculos,
        podeInativar: err.podeInativar,
      });
    } finally {
      setExcluindo(false);
    }
  };

  const empresasFiltradas = empresas.filter(emp => {
    const termo = termoBusca.toLowerCase().trim();
    const bateTexto =
      !termo ||
      emp.razaoSocial.toLowerCase().includes(termo) ||
      (emp.nomeFantasia && emp.nomeFantasia.toLowerCase().includes(termo)) ||
      emp.cnpj.includes(termo.replace(/\D/g, ''));

    if (!bateTexto) return false;
    if (filtroStatus === 'ATIVAS') return emp.status !== 'inativa';
    if (filtroStatus === 'INATIVAS') return emp.status === 'inativa';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {modo === 'FORM'
                  ? empresaEmEdicao
                    ? `Editar Empresa: ${empresaEmEdicao.razaoSocial}`
                    : 'Cadastrar Nova Empresa'
                  : 'Gerenciamento de Empresas'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {modo === 'FORM'
                  ? 'Preencha os dados contratuais, tributários e parâmetros da folha de pagamento.'
                  : `${empresas.length} empresa(s) cadastrada(s) no sistema Departamento Fácil`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {modo === 'FORM' && empresas.length > 0 && !empresaCriadaSucesso && (
              <button
                type="button"
                onClick={() => setModo('LISTA')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Voltar à Lista
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sucesso pós-criação com ações sugeridas */}
          {empresaCriadaSucesso && (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Empresa cadastrada com sucesso!
                  </h3>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                    <strong>{empresaCriadaSucesso.razaoSocial}</strong> (CNPJ {formatarCNPJ(empresaCriadaSucesso.cnpj)}) agora é a empresa ativa no sistema.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-wrap items-center gap-3">
                {onSolicitarCriarColaborador && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSolicitarCriarColaborador(empresaCriadaSucesso);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Users className="w-4 h-4" />
                    <span>Cadastrar Colaborador</span>
                  </button>
                )}

                {onSolicitarCriarCompetencia && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSolicitarCriarCompetencia(empresaCriadaSucesso);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Criar Competência</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEmpresaCriadaSucesso(null);
                    setModo('LISTA');
                  }}
                  className="px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:underline"
                >
                  Continuar no Gerenciamento
                </button>
              </div>
            </div>
          )}

          {/* MODO LISTAGEM */}
          {modo === 'LISTA' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={termoBusca}
                    onChange={e => setTermoBusca(e.target.value)}
                    placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
                    className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('TODAS')}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        filtroStatus === 'TODAS'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Todas ({empresas.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('ATIVAS')}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        filtroStatus === 'ATIVAS'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Ativas ({empresas.filter(e => e.status !== 'inativa').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('INATIVAS')}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        filtroStatus === 'INATIVAS'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Inativas ({empresas.filter(e => e.status === 'inativa').length})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={iniciarNovoCadastro}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Nova empresa</span>
                  </button>
                </div>
              </div>

              {/* Tabela / Cards de Empresas */}
              {empresasFiltradas.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                  <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nenhuma empresa encontrada com os filtros aplicados.
                  </p>
                  <button
                    type="button"
                    onClick={iniciarNovoCadastro}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Cadastrar Nova Empresa
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  {empresasFiltradas.map(emp => {
                    const isAtivaAtual = emp.id === empresaAtivaId;
                    const isInativa = emp.status === 'inativa';

                    return (
                      <div
                        key={emp.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isAtivaAtual
                            ? 'bg-blue-50/40 dark:bg-blue-950/20'
                            : isInativa
                            ? 'opacity-70 bg-slate-50/30 dark:bg-slate-900/40'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {emp.razaoSocial}
                            </span>
                            {emp.nomeFantasia && emp.nomeFantasia !== emp.razaoSocial && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                ({emp.nomeFantasia})
                              </span>
                            )}
                            {isAtivaAtual && (
                              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950 px-2 py-0.5 rounded">
                                Aberta no Sistema
                              </span>
                            )}
                            {isInativa && (
                              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950 px-2 py-0.5 rounded">
                                Inativa
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-mono">CNPJ: {formatarCNPJ(emp.cnpj)}</span>
                            <span>·</span>
                            <span>Regime: {emp.regimeTributario.replace('_', ' ')}</span>
                            <span>·</span>
                            <span>
                              {emp.endereco?.cidade || 'São Paulo'} - {emp.endereco?.uf || 'SP'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {!isAtivaAtual && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelecionarEmpresa(emp.id);
                                onClose();
                              }}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                              title="Abrir esta empresa para cálculo e gestão"
                            >
                              Selecionar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => iniciarEdicao(emp)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Editar Dados da Empresa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isInativa
                                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                            title={isInativa ? 'Reativar Empresa' : 'Inativar Empresa'}
                          >
                            {isInativa ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEmpresaParaExcluir(emp);
                              setErroExclusao(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Excluir Empresa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MODO FORMULÁRIO (CADASTRO / EDIÇÃO) */}
          {modo === 'FORM' && (
            <form onSubmit={handleSalvar} className="space-y-6">
              {mensagemErro && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mensagemErro}</span>
                </div>
              )}

              {avisoCNPJ && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    avisoCNPJ.includes('localizados') || avisoCNPJ.includes('sucesso')
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {avisoCNPJ.includes('localizados') || avisoCNPJ.includes('sucesso') ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{avisoCNPJ}</span>
                </div>
              )}

              {/* Seção 1: Identificação Básica */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  1. Identificação da Empresa
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        CNPJ <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleConsultarCNPJ()}
                        disabled={consultandoCNPJ || cnpj.replace(/\D/g, '').length !== 14}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-40 flex items-center gap-1 transition-opacity"
                        title="Consultar dados da empresa na Receita Federal via CNPJ"
                      >
                        <Search className="w-3 h-3" />
                        <span>{consultandoCNPJ ? 'Buscando...' : 'Buscar CNPJ'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={cnpj}
                      onChange={e => {
                        const novoCnpj = formatarCNPJ(e.target.value);
                        setCnpj(novoCnpj);
                        if (novoCnpj.replace(/\D/g, '').length === 14 && !razaoSocial) {
                          handleConsultarCNPJ(novoCnpj);
                        }
                      }}
                      maxLength={18}
                      placeholder="00.000.000/0000-00"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Razão Social <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={razaoSocial}
                      onChange={e => setRazaoSocial(e.target.value)}
                      placeholder="Ex: Confecções Estrela Ltda"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      value={nomeFantasia}
                      onChange={e => setNomeFantasia(e.target.value)}
                      placeholder="Ex: Estrela Modas"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      CNAE Principal
                    </label>
                    <input
                      type="text"
                      value={cnaePrincipal}
                      onChange={e => setCnaePrincipal(e.target.value)}
                      placeholder="Ex: 4781-4/00 - Comércio de vestuário"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Inscrição Estadual
                    </label>
                    <input
                      type="text"
                      value={inscricaoEstadual}
                      onChange={e => setInscricaoEstadual(e.target.value)}
                      placeholder="ISENTO ou número"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Inscrição Municipal
                    </label>
                    <input
                      type="text"
                      value={inscricaoMunicipal}
                      onChange={e => setInscricaoMunicipal(e.target.value)}
                      placeholder="Ex: 987.654"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Endereço do Estabelecimento */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  2. Endereço e Localização
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Logradouro</label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={e => setLogradouro(e.target.value)}
                      placeholder="Ex: Av. Paulista"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Número</label>
                    <input
                      type="text"
                      value={numero}
                      onChange={e => setNumero(e.target.value)}
                      placeholder="Ex: 1000"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={e => setBairro(e.target.value)}
                      placeholder="Ex: Centro"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Município</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={e => setCidade(e.target.value)}
                      placeholder="Ex: São Paulo"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">UF / CEP</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={uf}
                        onChange={e => setUf(e.target.value.toUpperCase())}
                        maxLength={2}
                        className="w-14 text-xs px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center font-bold"
                      />
                      <input
                        type="text"
                        value={cep}
                        onChange={e => setCep(formatarCEP(e.target.value))}
                        maxLength={9}
                        placeholder="00000-000"
                        className="flex-1 text-xs px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 3: Regime Tributário e Encargos */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  3. Regime Tributário e Encargos Previdenciários
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Regime Tributário
                    </label>
                    <select
                      value={regimeTributario}
                      onChange={e => setRegimeTributario(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SIMPLES_NACIONAL">Simples Nacional (Isento Cota Patronal 20%)</option>
                      <option value="LUCRO_PRESUMIDO">Lucro Presumido (20% CPP + RAT/FAP + Terceiros)</option>
                      <option value="LUCRO_REAL">Lucro Real (20% CPP + RAT/FAP + Terceiros)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Código FPAS</label>
                    <input
                      type="text"
                      value={fpas}
                      onChange={e => setFpas(e.target.value)}
                      placeholder="Ex: 507, 515"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Alíquota RAT / FAP
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block">RAT %</span>
                        <input
                          type="number"
                          step="0.01"
                          value={aliquotaRat}
                          onChange={e => setAliquotaRat(Number(e.target.value))}
                          className="w-full text-xs px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block">FAP</span>
                        <input
                          type="number"
                          step="0.01"
                          value={fap}
                          onChange={e => setFap(Number(e.target.value))}
                          className="w-full text-xs px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 4: Parâmetros da Folha de Pagamento */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  4. Parâmetros de Vencimentos e Pagamento da Folha
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dia Salário</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={diaPagamentoSalario}
                      onChange={e => setDiaPagamentoSalario(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">5º dia útil</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dia Adiantamento</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={diaAdiantamento}
                      onChange={e => setDiaAdiantamento(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Geralmente dia 20</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">% Adiantamento</label>
                    <input
                      type="number"
                      min={10}
                      max={50}
                      value={percentualAdiantamento}
                      onChange={e => setPercentualAdiantamento(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Padrão 40%</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vencimento FGTS</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={diaVencimentoFGTS}
                      onChange={e => setDiaVencimentoFGTS(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">FGTS Digital (Dia 20)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Venc. DCTFWeb</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={diaVencimentoDCTFWeb}
                      onChange={e => setDiaVencimentoDCTFWeb(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">DARF Previdenciário (Dia 15)</span>
                  </div>
                </div>
              </div>

              {/* Footer do formulário */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                {empresas.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setModo('LISTA')}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{salvando ? 'Gravando no banco...' : 'Salvar Empresa e Continuar'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão de Empresa */}
      {empresaParaExcluir && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Excluir Empresa
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Você está prestes a excluir a empresa:
                </p>
                <div className="mt-2 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs space-y-0.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100">{empresaParaExcluir.razaoSocial}</div>
                  <div className="font-mono text-slate-500 dark:text-slate-400">CNPJ: {formatarCNPJ(empresaParaExcluir.cnpj)}</div>
                </div>
              </div>
            </div>

            {erroExclusao && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-2">
                <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Vínculos impeditivos encontrados</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300">{erroExclusao.mensagem}</p>
                {erroExclusao.vinculos && (
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 font-mono space-y-0.5 pt-1">
                    {erroExclusao.vinculos.colaboradores > 0 && (
                      <li>{erroExclusao.vinculos.colaboradores} colaborador(es) cadastrado(s)</li>
                    )}
                    {erroExclusao.vinculos.folhasCalculadas > 0 && (
                      <li>{erroExclusao.vinculos.folhasCalculadas} folha(s) de pagamento processada(s)</li>
                    )}
                    {erroExclusao.vinculos.periodosFerias > 0 && (
                      <li>{erroExclusao.vinculos.periodosFerias} período(s) de férias registrado(s)</li>
                    )}
                  </ul>
                )}
                {erroExclusao.podeInativar && (
                  <div className="pt-2 border-t border-amber-200 dark:border-amber-800 flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        await api.inativarEmpresa(empresaParaExcluir.id, true);
                        onEmpresasAtualizadas();
                        setEmpresaParaExcluir(null);
                        setErroExclusao(null);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Inativar Empresa em vez de Excluir
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEmpresaParaExcluir(null);
                  setErroExclusao(null);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={excluindo}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {excluindo ? 'Verificando e Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
