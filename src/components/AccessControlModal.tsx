import React, { useState, useEffect } from 'react';
import {
  AcoesPermissao,
  ConfiguracaoAcessoSistema,
  Empregado,
  ModuloSistemaId,
  UserRole,
} from '../types/dp';
import {
  ShieldCheck,
  UserCog,
  Briefcase,
  User,
  X,
  RotateCcw,
  Check,
  Lock,
  Unlock,
  SlidersHorizontal,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const ACCESS_CONFIG_STORAGE_KEY = 'df_access_config_v1';

export const CONFIGURACAO_ACESSO_PADRAO: ConfiguracaoAcessoSistema = {
  operadorNome: 'Operador de DP',
  portalEmpregadoId: '',
  perfis: {
    admin: {
      label: 'Administrador',
      subtitulo: 'Acesso total & governança',
      descricao: 'Controle irrestrito sobre empresas, folha, rescisões, eSocial e reabertura de competências.',
      modulos: {
        DASHBOARD: true,
        FOLHA: true,
        DECIMO_TERCEIRO: true,
        EMPREGADOS: true,
        FERIAS: true,
        RESCISAO: true,
        CONTRATOS: true,
        MOVIMENTACOES: true,
        ESOCIAL: true,
      },
      acoes: {
        gerenciarEmpresas: true,
        gerenciarEmpregados: true,
        calcularFolha: true,
        fecharReabrirFolha: true,
        homologarRescisao: true,
        transmitirEsocial: true,
      },
    },
    dp_operator: {
      label: 'Operador DP',
      subtitulo: 'Rotinas operacionais e cálculos',
      descricao: 'Executa admissões, cálculos mensais, eventos, férias, rescisões e envios ao eSocial.',
      modulos: {
        DASHBOARD: true,
        FOLHA: true,
        DECIMO_TERCEIRO: true,
        EMPREGADOS: true,
        FERIAS: true,
        RESCISAO: true,
        CONTRATOS: true,
        MOVIMENTACOES: true,
        ESOCIAL: true,
      },
      acoes: {
        gerenciarEmpresas: true,
        gerenciarEmpregados: true,
        calcularFolha: true,
        fecharReabrirFolha: true,
        homologarRescisao: true,
        transmitirEsocial: true,
      },
    },
    gestor: {
      label: 'Gestor Empresa',
      subtitulo: 'Consulta gerencial e pessoas',
      descricao: 'Acompanha indicadores, equipe, férias, contratos e ponto sem alterar cálculos fiscais ou fechar folha.',
      modulos: {
        DASHBOARD: true,
        FOLHA: false,
        DECIMO_TERCEIRO: false,
        EMPREGADOS: true,
        FERIAS: true,
        RESCISAO: false,
        CONTRATOS: true,
        MOVIMENTACOES: true,
        ESOCIAL: false,
      },
      acoes: {
        gerenciarEmpresas: false,
        gerenciarEmpregados: false,
        calcularFolha: false,
        fecharReabrirFolha: false,
        homologarRescisao: false,
        transmitirEsocial: false,
      },
    },
  },
};

export function carregarConfiguracaoAcesso(): ConfiguracaoAcessoSistema {
  try {
    const raw = localStorage.getItem(ACCESS_CONFIG_STORAGE_KEY);
    if (!raw) return structuredClone(CONFIGURACAO_ACESSO_PADRAO);
    const parsed = JSON.parse(raw) as Partial<ConfiguracaoAcessoSistema>;
    return {
      operadorNome: parsed.operadorNome || CONFIGURACAO_ACESSO_PADRAO.operadorNome,
      portalEmpregadoId: parsed.portalEmpregadoId || '',
      perfis: {
        admin: {
          ...CONFIGURACAO_ACESSO_PADRAO.perfis.admin,
          ...(parsed.perfis?.admin || {}),
          modulos: {
            ...CONFIGURACAO_ACESSO_PADRAO.perfis.admin.modulos,
            ...(parsed.perfis?.admin?.modulos || {}),
          },
          acoes: {
            ...CONFIGURACAO_ACESSO_PADRAO.perfis.admin.acoes,
            ...(parsed.perfis?.admin?.acoes || {}),
          },
        },
        dp_operator: {
          ...CONFIGURACAO_ACESSO_PADRAO.perfis.dp_operator,
          ...(parsed.perfis?.dp_operator || {}),
          modulos: {
            ...CONFIGURACAO_ACESSO_PADRAO.perfis.dp_operator.modulos,
            ...(parsed.perfis?.dp_operator?.modulos || {}),
          },
          acoes: {
            ...CONFIGURACAO_ACESSO_PADRAO.perfis.dp_operator.acoes,
            ...(parsed.perfis?.dp_operator?.acoes || {}),
          },
        },
        gestor: {
          ...CONFIGURACAO_ACESSO_PADRAO.perfis.gestor,
          ...(parsed.perfis?.gestor || {}),
          modulos: {
            ...CONFIGURACAO_ACESSO_PADRAO.perfis.gestor.modulos,
            ...(parsed.perfis?.gestor?.modulos || {}),
          },
          acoes: {
            ...CONFIGURACAO_ACESSO_PADRAO.perfis.gestor.acoes,
            ...(parsed.perfis?.gestor?.acoes || {}),
          },
        },
      },
    };
  } catch {
    return structuredClone(CONFIGURACAO_ACESSO_PADRAO);
  }
}

export function salvarConfiguracaoAcesso(config: ConfiguracaoAcessoSistema) {
  try {
    localStorage.setItem(ACCESS_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignorar falha de armazenamento local em ambiente restrito
  }
}

const MODULOS_METADATA: Array<{ id: ModuloSistemaId; label: string; grupo: string }> = [
  { id: 'DASHBOARD', label: 'Visão Geral & Prazos', grupo: 'Rotinas Mensais' },
  { id: 'FOLHA', label: 'Folha de Pagamento', grupo: 'Rotinas Mensais' },
  { id: 'DECIMO_TERCEIRO', label: '13º Salário (1ª/2ª Parc.)', grupo: 'Rotinas Mensais' },
  { id: 'FERIAS', label: 'Férias & Afastamentos', grupo: 'Rotinas Mensais' },
  { id: 'RESCISAO', label: 'Rescisão & TRCT', grupo: 'Rotinas Mensais' },
  { id: 'EMPREGADOS', label: 'Empregados & Admissão', grupo: 'Gestão de Pessoas' },
  { id: 'CONTRATOS', label: 'Contratos & Recibos', grupo: 'Gestão de Pessoas' },
  { id: 'MOVIMENTACOES', label: 'Movimentações & Ponto', grupo: 'Gestão de Pessoas' },
  { id: 'ESOCIAL', label: 'eSocial & Obrigações', grupo: 'Obrigações & eSocial' },
];

const ACOES_METADATA: Array<{ key: keyof AcoesPermissao; label: string; detalhe: string }> = [
  {
    key: 'gerenciarEmpresas',
    label: 'Cadastrar, editar e excluir empresas',
    detalhe: 'Permite alterar parâmetros fiscais (FPAS, RAT, FAP) e excluir CNPJs.',
  },
  {
    key: 'gerenciarEmpregados',
    label: 'Admitir e alterar dados de empregados',
    detalhe: 'Admissões, edições cadastrais, promoções salariais e exclusão de fichas.',
  },
  {
    key: 'calcularFolha',
    label: 'Calcular folha e lançar eventos',
    detalhe: 'Processar folha individual/lote, lançar horas extras, faltas e rubricas.',
  },
  {
    key: 'fecharReabrirFolha',
    label: 'Aprovar, fechar e reabrir competência',
    detalhe: 'Encerrar competência mensal ou reabrir folha já fechada com justificativa.',
  },
  {
    key: 'homologarRescisao',
    label: 'Simular, homologar e cancelar rescisões',
    detalhe: 'Emitir TRCT definitivo, alterar status de desligamento e cancelar rescisão.',
  },
  {
    key: 'transmitirEsocial',
    label: 'Transmitir eventos ao eSocial',
    detalhe: 'Enviar eventos S-1200, S-1210, S-2200, S-2299 e retificações.',
  },
];

interface AccessControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  configAtual: ConfiguracaoAcessoSistema;
  roleAtivo: UserRole;
  empregados: Empregado[];
  onSalvar: (novaConfig: ConfiguracaoAcessoSistema, novoRole?: UserRole) => void;
}

export const AccessControlModal: React.FC<AccessControlModalProps> = ({
  isOpen,
  onClose,
  configAtual,
  roleAtivo,
  empregados,
  onSalvar,
}) => {
  const [rascunho, setRascunho] = useState<ConfiguracaoAcessoSistema>(configAtual);
  const [abaPerfil, setAbaPerfil] = useState<UserRole>(roleAtivo);
  const [aplicarPerfilAoSalvar, setAplicarPerfilAoSalvar] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRascunho(structuredClone(configAtual));
      setAbaPerfil(roleAtivo);
      setAplicarPerfilAoSalvar(false);
    }
  }, [isOpen, configAtual, roleAtivo]);

  if (!isOpen) return null;

  const isEmployeeTab = abaPerfil === 'employee';
  const perfilEditando = !isEmployeeTab ? rascunho.perfis[abaPerfil] : null;

  const toggleModulo = (moduloId: ModuloSistemaId) => {
    if (isEmployeeTab) return;
    setRascunho(prev => ({
      ...prev,
      perfis: {
        ...prev.perfis,
        [abaPerfil]: {
          ...prev.perfis[abaPerfil],
          modulos: {
            ...prev.perfis[abaPerfil].modulos,
            [moduloId]: !prev.perfis[abaPerfil].modulos[moduloId],
          },
        },
      },
    }));
  };

  const toggleAcao = (acaoKey: keyof AcoesPermissao) => {
    if (isEmployeeTab) return;
    setRascunho(prev => ({
      ...prev,
      perfis: {
        ...prev.perfis,
        [abaPerfil]: {
          ...prev.perfis[abaPerfil],
          acoes: {
            ...prev.perfis[abaPerfil].acoes,
            [acaoKey]: !prev.perfis[abaPerfil].acoes[acaoKey],
          },
        },
      },
    }));
  };

  const marcarTodosModulos = (valor: boolean) => {
    if (isEmployeeTab) return;
    setRascunho(prev => {
      const novosModulos = { ...prev.perfis[abaPerfil].modulos };
      (Object.keys(novosModulos) as ModuloSistemaId[]).forEach(k => {
        novosModulos[k] = valor;
      });
      // Garante ao menos Visão Geral visível se desmarcar tudo
      if (!valor) {
        novosModulos.DASHBOARD = true;
      }
      return {
        ...prev,
        perfis: {
          ...prev.perfis,
          [abaPerfil]: {
            ...prev.perfis[abaPerfil],
            modulos: novosModulos,
          },
        },
      };
    });
  };

  const handleRestaurarPadroes = () => {
    setRascunho(structuredClone(CONFIGURACAO_ACESSO_PADRAO));
  };

  const handleConfirmar = (entrarNoPerfilSelecionado = false) => {
    const configLimpa: ConfiguracaoAcessoSistema = {
      ...rascunho,
      operadorNome: rascunho.operadorNome.trim() || 'Operador de DP',
    };
    onSalvar(
      configLimpa,
      entrarNoPerfilSelecionado || aplicarPerfilAoSalvar ? abaPerfil : undefined
    );
    onClose();
  };

  const totalModulosAtivos = perfilEditando
    ? Object.values(perfilEditando.modulos).filter(Boolean).length
    : 0;
  const totalAcoesAtivas = perfilEditando
    ? Object.values(perfilEditando.acoes).filter(Boolean).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Ajustar Perfis e Permissões de Acesso
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure quais módulos e operações críticas ficam liberados em cada perfil do sistema.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Abas de Perfil */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identificação do Responsável para Auditoria */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <UserCog className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Identificação do Operador / Auditoria
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nome registrado automaticamente ao avançar etapas, fechar ou reabrir competências.
              </p>
            </div>
            <input
              type="text"
              value={rascunho.operadorNome}
              onChange={e => setRascunho(prev => ({ ...prev, operadorNome: e.target.value }))}
              placeholder="Ex: Mariana Duarte (DP)"
              className="w-full sm:w-64 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Seletor de Perfil a Configurar */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Selecione o Perfil para Visualizar ou Ajustar Permissões
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {(
                [
                  { id: 'dp_operator' as const, label: 'Operador DP', sub: 'Rotina operacional', icon: UserCog },
                  { id: 'admin' as const, label: 'Administrador', sub: 'Governança total', icon: ShieldCheck },
                  { id: 'gestor' as const, label: 'Gestor Empresa', sub: 'Consulta & equipes', icon: Briefcase },
                  { id: 'employee' as const, label: 'Portal Empregado', sub: 'Visão do colaborador', icon: User },
                ]
              ).map(tab => {
                const Icon = tab.icon;
                const selecionado = abaPerfil === tab.id;
                const emUso = roleAtivo === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAbaPerfil(tab.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selecionado
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon
                        className={`w-4 h-4 ${
                          selecionado ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      />
                      {emUso && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Em uso
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{tab.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{tab.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conteúdo Específico do Perfil Selecionado */}
          {isEmployeeTab ? (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Configuração do Portal do Empregado (Autoatendimento)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Neste modo, o usuário visualiza apenas seus próprios holerites, programação de férias, documentos pessoais e histórico de ponto — sem acesso aos dados da empresa ou de outros colegas.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Colaborador simulado ao acessar o Portal Empregado:
                </label>
                {empregados.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Nenhum colaborador cadastrado na empresa ativa. Será exibido um perfil demonstrativo até que haja admissões.
                  </div>
                ) : (
                  <select
                    value={rascunho.portalEmpregadoId || empregados[0]?.id || ''}
                    onChange={e => setRascunho(prev => ({ ...prev, portalEmpregadoId: e.target.value }))}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {empregados.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nomeCompleto} — Matrícula {emp.matricula} ({emp.cargo})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            perfilEditando && (
              <div className="space-y-5">
                {/* Resumo do Perfil */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      {perfilEditando.label} — {perfilEditando.subtitulo}
                    </div>
                    <div className="text-[11px] text-blue-700 dark:text-blue-300/90">
                      {perfilEditando.descricao}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold shrink-0">
                    <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-blue-200 dark:border-blue-800">
                      {totalModulosAtivos}/8 módulos
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-blue-200 dark:border-blue-800">
                      {totalAcoesAtivas}/6 ações
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Coluna 1: Módulos Visíveis no Menu */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          1. Módulos Visíveis na Navegação
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Define quais telas aparecem na barra lateral e menu móvel.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => marcarTodosModulos(true)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => marcarTodosModulos(false)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          Mínimo
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {MODULOS_METADATA.map(mod => {
                        const ativo = perfilEditando.modulos[mod.id];
                        const bloqueado = mod.id === 'DASHBOARD' && totalModulosAtivos <= 1 && ativo;
                        return (
                          <label
                            key={mod.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                              ativo
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                                : 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-75'
                            } ${bloqueado ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {mod.label}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">{mod.grupo}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={ativo}
                              disabled={bloqueado}
                              onChange={() => toggleModulo(mod.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coluna 2: Operações Críticas */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        2. Permissões de Ações Críticas
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Controla alterações, fechamentos, exclusões e envios fiscais.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {ACOES_METADATA.map(acao => {
                        const ativo = perfilEditando.acoes[acao.key];
                        return (
                          <label
                            key={acao.key}
                            className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                              ativo
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                                : 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {ativo ? (
                                <Unlock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {acao.label}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                  {acao.detalhe}
                                </div>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={ativo}
                              onChange={() => toggleAcao(acao.key)}
                              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRestaurarPadroes}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrões
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancelar
            </button>

            {abaPerfil !== roleAtivo && (
              <button
                type="button"
                onClick={() => handleConfirmar(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Salvar e Entrar como {isEmployeeTab ? 'Empregado' : perfilEditando?.label}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleConfirmar(false)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              Salvar Configurações de Acesso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
