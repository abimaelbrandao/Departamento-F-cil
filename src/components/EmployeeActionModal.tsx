import React, { useState } from 'react';
import { Empregado, Empresa } from '../types/dp';
import { api } from '../services/api';
import { formatarMoeda, formatarData, formatarCPF, formatarCNPJ, validarCPF } from '../utils/formatters';
import {
  User,
  X,
  Edit2,
  Trash2,
  UserX,
  History,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Briefcase,
  Clock,
  ShieldAlert,
  Calendar,
  Building2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empregado: Empregado | null;
  empresa: Empresa;
  onEmpregadoAtualizado: () => void;
  modoInicial?: 'CONSULTA' | 'EDICAO' | 'ALTERACAO_SALARIAL' | 'DESLIGAMENTO' | 'EXCLUSAO';
  onAbrirRescisao?: (empregado: Empregado) => void;
}

export const EmployeeActionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empregado,
  empresa,
  onEmpregadoAtualizado,
  modoInicial = 'CONSULTA',
  onAbrirRescisao,
}) => {
  const [modo, setModo] = useState<'CONSULTA' | 'EDICAO' | 'ALTERACAO_SALARIAL' | 'DESLIGAMENTO' | 'EXCLUSAO'>(modoInicial);
  const [salvando, setSalvando] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ texto: string; erro?: boolean } | null>(null);

  // Estados de Edição Cadastral
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [cargo, setCargo] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [salarioBase, setSalarioBase] = useState<number>(0);
  const [escala, setEscala] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  // Estados de Alteração com Vigência
  const [tipoAlteracao, setTipoAlteracao] = useState<'SALARIO' | 'CARGO' | 'JORNADA'>('SALARIO');
  const [novoValorAlteracao, setNovoValorAlteracao] = useState<string>('');
  const [dataVigencia, setDataVigencia] = useState(new Date().toISOString().split('T')[0]);
  const [motivoAlteracao, setMotivoAlteracao] = useState('');

  // Estados de Desligamento
  const [dataDesligamento, setDataDesligamento] = useState(new Date().toISOString().split('T')[0]);
  const [motivoDesligamento, setMotivoDesligamento] = useState('Dispensa sem justa causa por iniciativa do empregador');
  const [observacoesDesligamento, setObservacoesDesligamento] = useState('');

  // Erro de exclusão
  const [erroExclusao, setErroExclusao] = useState<{
    mensagem: string;
    vinculos?: any;
    podeDesligar?: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (empregado) {
      setNomeCompleto(empregado.nomeCompleto || '');
      setCpf(formatarCPF(empregado.cpf));
      setRg(empregado.rg || '');
      setCargo(empregado.cargo || '');
      setDepartamento(empregado.departamento || '');
      setSalarioBase(empregado.salarioBase || 0);
      setEscala(empregado.escala || '');
      setEmail(empregado.email || '');
      setTelefone(empregado.telefone || '');
      setNovoValorAlteracao(String(empregado.salarioBase || 0));
    }
    setModo(modoInicial);
    setStatusMsg(null);
    setErroExclusao(null);
  }, [empregado, modoInicial, isOpen]);

  if (!isOpen || !empregado) return null;

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length === 11 && !validarCPF(cpfLimpo)) {
      setStatusMsg({ texto: 'CPF informado é inválido.', erro: true });
      return;
    }

    try {
      setSalvando(true);
      await api.salvarEmpregado({
        id: empregado.id,
        nomeCompleto: nomeCompleto.trim(),
        cpf: cpfLimpo || empregado.cpf,
        rg,
        cargo,
        departamento,
        salarioBase: Number(salarioBase),
        escala,
        email,
        telefone,
      });

      setStatusMsg({ texto: 'Dados do colaborador atualizados com sucesso.' });
      onEmpregadoAtualizado();
      setTimeout(() => {
        setModo('CONSULTA');
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ texto: err.message || 'Erro ao salvar alterações.', erro: true });
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarAlteracaoVigencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!novoValorAlteracao) {
      setStatusMsg({ texto: 'Informe o novo valor da alteração.', erro: true });
      return;
    }
    if (!motivoAlteracao.trim()) {
      setStatusMsg({ texto: 'Informe o motivo da alteração contratual.', erro: true });
      return;
    }

    try {
      setSalvando(true);
      await api.registrarAlteracaoEmpregado(empregado.id, {
        tipo: tipoAlteracao,
        valorNovo: tipoAlteracao === 'SALARIO' ? Number(novoValorAlteracao) : novoValorAlteracao,
        dataVigencia,
        motivo: motivoAlteracao,
        responsavel: 'Operador DP',
      });

      setStatusMsg({ texto: 'Alteração contratual e histórico de vigência registrados com sucesso.' });
      onEmpregadoAtualizado();
      setTimeout(() => {
        setModo('CONSULTA');
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ texto: err.message || 'Erro ao registrar alteração contratual.', erro: true });
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarDesligamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    try {
      setSalvando(true);
      await api.registrarDesligamento(empregado.id, {
        dataDesligamento,
        motivo: motivoDesligamento,
        observacoes: observacoesDesligamento,
      });

      setStatusMsg({ texto: `Desligamento do colaborador ${empregado.nomeCompleto} registrado com sucesso!` });
      onEmpregadoAtualizado();

      if (onAbrirRescisao) {
        setTimeout(() => {
          onClose();
          onAbrirRescisao({ ...empregado, status: 'desligado', dataDesligamento });
        }, 1200);
      } else {
        setTimeout(() => setModo('CONSULTA'), 1200);
      }
    } catch (err: any) {
      setStatusMsg({ texto: err.message || 'Erro ao registrar desligamento.', erro: true });
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarExclusao = async () => {
    try {
      setSalvando(true);
      setErroExclusao(null);
      await api.excluirEmpregado(empregado.id);
      onEmpregadoAtualizado();
      onClose();
    } catch (err: any) {
      setErroExclusao({
        mensagem: err.message,
        vinculos: err.vinculos,
        podeDesligar: err.podeDesligar,
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {empregado.nomeCompleto}
                </span>
                <span className="font-mono text-[10px] text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  Matrícula: {empregado.matricula}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    empregado.status === 'ativo'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : empregado.status === 'desligado'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {empregado.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {empresa.razaoSocial} · {empregado.cargo} · Salário {formatarMoeda(empregado.salarioBase)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Ações Rápidas por Modo */}
        <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setModo('CONSULTA')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              modo === 'CONSULTA'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Ficha Cadastral
          </button>
          <button
            type="button"
            onClick={() => setModo('EDICAO')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              modo === 'EDICAO'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Editar Cadastro
          </button>
          <button
            type="button"
            onClick={() => setModo('ALTERACAO_SALARIAL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              modo === 'ALTERACAO_SALARIAL'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Registrar Alteração / Vigência
          </button>
          {empregado.status !== 'desligado' && (
            <button
              type="button"
              onClick={() => setModo('DESLIGAMENTO')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                modo === 'DESLIGAMENTO'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Registrar Desligamento
            </button>
          )}
          <button
            type="button"
            onClick={() => setModo('EXCLUSAO')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 ml-auto ${
              modo === 'EXCLUSAO' ? 'bg-rose-100 text-rose-800 font-bold' : ''
            }`}
          >
            Excluir Vínculo
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                statusMsg.erro
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              }`}
            >
              {statusMsg.erro ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{statusMsg.texto}</span>
            </div>
          )}

          {/* MODO 1: CONSULTA DE FICHA CADASTRAL */}
          {modo === 'CONSULTA' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                    Dados Pessoais e Identificação
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-400 block">CPF:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatarCPF(empregado.cpf)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">RG:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{empregado.rg || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">PIS:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{empregado.pis || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Data de Nascimento:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{formatarData(empregado.dataNascimento)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">E-mail:</span>
                      <span className="truncate block">{empregado.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Telefone:</span>
                      <span>{empregado.telefone || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                    Dados Contratuais e Lotação
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Admissão:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatarData(empregado.dataAdmissao)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Vínculo:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{empregado.vinculo}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Salário Base:</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">{formatarMoeda(empregado.salarioBase)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">CBO:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{empregado.cbo || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Lotação / Departamento:</span>
                      <span>{empregado.departamento || 'Geral'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Jornada / Escala:</span>
                      <span className="truncate block">{empregado.escala || '44h semanais'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Histórico de Alterações Salariais e de Cargo */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>Histórico de Alterações Contratuais com Vigência</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setModo('ALTERACAO_SALARIAL')}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    + Registrar Alteração
                  </button>
                </div>

                {!empregado.historicoAlteracoes || empregado.historicoAlteracoes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhuma alteração de salário, cargo ou jornada registrada para este colaborador até o momento.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                    {empregado.historicoAlteracoes.map(hist => (
                      <div key={hist.id} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {hist.tipo}: {hist.valorAnterior} → {hist.valorNovo}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                            Vigência: <strong>{formatarData(hist.dataVigencia)}</strong> · Motivo: {hist.motivo}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Registrado em {formatarData(hist.dataRegistro)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODO 2: EDIÇÃO CADASTRAL */}
          {modo === 'EDICAO' && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={nomeCompleto}
                    onChange={e => setNomeCompleto(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CPF</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={e => setCpf(formatarCPF(e.target.value))}
                    maxLength={14}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">RG</label>
                  <input
                    type="text"
                    value={rg}
                    onChange={e => setRg(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cargo</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={e => setCargo(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={departamento}
                    onChange={e => setDepartamento(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Salário Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salarioBase}
                    onChange={e => setSalarioBase(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Escala / Horário</label>
                  <input
                    type="text"
                    value={escala}
                    onChange={e => setEscala(e.target.value)}
                    placeholder="Ex: Segunda a Sexta (08:00 às 17:48)"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModo('CONSULTA')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          )}

          {/* MODO 3: REGISTRAR ALTERAÇÃO COM HISTÓRICO E VIGÊNCIA */}
          {modo === 'ALTERACAO_SALARIAL' && (
            <form onSubmit={handleSalvarAlteracaoVigencia} className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Registrar Alteração Contratual com Data de Vigência
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de Alteração
                    </label>
                    <select
                      value={tipoAlteracao}
                      onChange={e => setTipoAlteracao(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                    >
                      <option value="SALARIO">Reajuste / Aumento Salarial</option>
                      <option value="CARGO">Promoção / Mudança de Cargo</option>
                      <option value="JORNADA">Alteração de Jornada / Escala</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Data de Vigência <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dataVigencia}
                      onChange={e => setDataVigencia(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {tipoAlteracao === 'SALARIO'
                        ? 'Novo Salário Base (R$)'
                        : tipoAlteracao === 'CARGO'
                        ? 'Novo Cargo / Função'
                        : 'Nova Escala de Trabalho'}
                    </label>
                    <input
                      type={tipoAlteracao === 'SALARIO' ? 'number' : 'text'}
                      step={tipoAlteracao === 'SALARIO' ? '0.01' : undefined}
                      required
                      value={novoValorAlteracao}
                      onChange={e => setNovoValorAlteracao(e.target.value)}
                      placeholder={tipoAlteracao === 'SALARIO' ? 'Ex: 4200.00' : 'Ex: Analista Sênior'}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Motivo / Justificativa Legal
                    </label>
                    <input
                      type="text"
                      required
                      value={motivoAlteracao}
                      onChange={e => setMotivoAlteracao(e.target.value)}
                      placeholder="Ex: Dissídio coletivo / Mérito / Promoção técnica"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('CONSULTA')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {salvando ? 'Gravando Histórico...' : 'Registrar Alteração Contratual'}
                </button>
              </div>
            </form>
          )}

          {/* MODO 4: REGISTRAR DESLIGAMENTO */}
          {modo === 'DESLIGAMENTO' && (
            <form onSubmit={handleConfirmarDesligamento} className="space-y-4">
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 space-y-4">
                <div className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-rose-600" />
                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                    Registrar Desligamento do Colaborador
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Data do Desligamento (Afastamento) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dataDesligamento}
                      onChange={e => setDataDesligamento(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Motivo do Desligamento
                    </label>
                    <select
                      value={motivoDesligamento}
                      onChange={e => setMotivoDesligamento(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                    >
                      <option value="Dispensa sem justa causa por iniciativa do empregador">
                        Dispensa sem justa causa (pelo empregador)
                      </option>
                      <option value="Pedido de demissão pelo empregado">
                        Pedido de demissão pelo empregado
                      </option>
                      <option value="Término normal do contrato de trabalho a prazo determinado / experiência">
                        Término de contrato de experiência
                      </option>
                      <option value="Rescisão por acordo mútuo entre as partes (Art. 484-A CLT)">
                        Acordo mútuo (Art. 484-A da CLT)
                      </option>
                      <option value="Dispensa com justa causa (Art. 482 CLT)">
                        Dispensa com justa causa (falta grave)
                      </option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Observações Adicionais
                    </label>
                    <textarea
                      rows={2}
                      value={observacoesDesligamento}
                      onChange={e => setObservacoesDesligamento(e.target.value)}
                      placeholder="Informações sobre cumprimento do aviso prévio, devolução de equipamentos, etc."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('CONSULTA')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  <span>{salvando ? 'Processando...' : 'Confirmar Desligamento & Abrir TRCT'}</span>
                </button>
              </div>
            </form>
          )}

          {/* MODO 5: EXCLUSÃO DE CADASTRO CRIADO POR ENGANO */}
          {modo === 'EXCLUSAO' && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      Excluir Vínculo do Colaborador
                    </h4>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                      A exclusão é permitida apenas para vínculos criados por engano que ainda não possuam folhas fechadas, férias quitadas ou rescisão homologada.
                    </p>
                  </div>
                </div>
              </div>

              {erroExclusao && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <p className="font-bold">{erroExclusao.mensagem}</p>
                  <p>{erroExclusao.vinculos && 'Existem registros oficiais vinculados a este colaborador.'}</p>
                  {erroExclusao.podeDesligar && (
                    <button
                      type="button"
                      onClick={() => setModo('DESLIGAMENTO')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                    >
                      Ir para Registrar Desligamento
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('CONSULTA')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarExclusao}
                  disabled={salvando}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {salvando ? 'Excluindo...' : 'Confirmar Exclusão do Vínculo'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
