import React, { useState, useEffect } from 'react';
import {
  Empregado,
  Empresa,
  VinculoEmpregaticio,
  Dependente,
  Beneficio,
} from '../types/dp';
import { api } from '../services/api';
import {
  formatarMoeda,
  formatarData,
  formatarCPF,
  formatarCEP,
  validarCPF,
} from '../utils/formatters';
import { gerarRegistroEmpregadoPDF } from '../utils/pdfGenerator';
import {
  User,
  X,
  Edit2,
  UserX,
  History,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  MapPin,
  Landmark,
  Briefcase,
  Users,
  Plus,
  Trash2,
  Download,
  HeartHandshake,
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

type AbaEdicaoFicha = 'PESSOAL' | 'ENDERECO_BANCO' | 'CONTRATO' | 'DEPENDENTES_BENEFICIOS';

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
  const [abaEdicao, setAbaEdicao] = useState<AbaEdicaoFicha>('PESSOAL');
  const [salvando, setSalvando] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ texto: string; erro?: boolean } | null>(null);

  // 1. Dados Pessoais & Documentação
  const [matricula, setMatricula] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [orgaoExpedidor, setOrgaoExpedidor] = useState('');
  const [rgUF, setRgUF] = useState('');
  const [rgDataEmissao, setRgDataEmissao] = useState('');
  const [pis, setPis] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F' | 'OUTRO'>('M');
  const [estadoCivil, setEstadoCivil] = useState<'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'UNIAO_ESTAVEL' | 'VIUVO'>('SOLTEIRO');
  const [nacionalidade, setNacionalidade] = useState('Brasileira');
  const [naturalidade, setNaturalidade] = useState('');
  const [naturalidadeUF, setNaturalidadeUF] = useState('');
  const [etniaRaca, setEtniaRaca] = useState('');
  const [grauInstrucao, setGrauInstrucao] = useState('');
  const [nomeMae, setNomeMae] = useState('');
  const [nomePai, setNomePai] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  // CTPS / Título / CNH
  const [ctpsNumero, setCtpsNumero] = useState('');
  const [ctpsSerie, setCtpsSerie] = useState('');
  const [ctpsDV, setCtpsDV] = useState('');
  const [ctpsUF, setCtpsUF] = useState('');
  const [ctpsDataEmissao, setCtpsDataEmissao] = useState('');
  const [tituloEleitor, setTituloEleitor] = useState('');
  const [tituloZona, setTituloZona] = useState('');
  const [tituloSecao, setTituloSecao] = useState('');
  const [cnh, setCnh] = useState('');
  const [cnhCategoria, setCnhCategoria] = useState('');
  const [cnhValidade, setCnhValidade] = useState('');

  // 2. Endereço & Dados Bancários
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');

  const [banco, setBanco] = useState('');
  const [codigoBanco, setCodigoBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [tipoConta, setTipoConta] = useState<'CORRENTE' | 'POUPANCA' | 'SALARIO'>('CORRENTE');
  const [chavePix, setChavePix] = useState('');

  // 3. Dados Contratuais, Lotação & Incidências CLT
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [vinculo, setVinculo] = useState<VinculoEmpregaticio>('CLT');
  const [tipoContrato, setTipoContrato] = useState<'INDETERMINADO' | 'EXPERIENCIA_45_45' | 'DETERMINADO' | 'TEMPORARIO'>('INDETERMINADO');
  const [statusVinculo, setStatusVinculo] = useState<Empregado['status']>('ativo');
  const [cargo, setCargo] = useState('');
  const [cbo, setCbo] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [centroDeCusto, setCentroDeCusto] = useState('');
  const [salarioBase, setSalarioBase] = useState<number>(0);
  const [tipoSalario, setTipoSalario] = useState<'MENSALISTA' | 'HORISTA'>('MENSALISTA');
  const [jornadaHorasSemanais, setJornadaHorasSemanais] = useState<number>(44);
  const [divisorHoras, setDivisorHoras] = useState<number>(220);
  const [escala, setEscala] = useState('');
  const [optanteFGTS, setOptanteFGTS] = useState<boolean>(true);
  const [aliquotaFGTS, setAliquotaFGTS] = useState<number>(0.08);
  const [adicionalPericulosidade, setAdicionalPericulosidade] = useState<boolean>(false);
  const [adicionalInsalubridade, setAdicionalInsalubridade] = useState<'NENHUMA' | 'MINIMO_10' | 'MEDIO_20' | 'MAXIMO_40'>('NENHUMA');
  const [pensaoAlimenticiaPercentual, setPensaoAlimenticiaPercentual] = useState<number>(0);
  const [pensaoAlimenticiaValorFixo, setPensaoAlimenticiaValorFixo] = useState<number>(0);
  const [categoriaTrabalhador, setCategoriaTrabalhador] = useState('01 - Empregado');
  const [codigoSindical, setCodigoSindical] = useState('');
  const [sindicatoLaboral, setSindicatoLaboral] = useState('');

  // 4. Dependentes & Benefícios
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);

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

  useEffect(() => {
    if (empregado) {
      setMatricula(empregado.matricula || '');
      setNomeCompleto(empregado.nomeCompleto || '');
      setCpf(formatarCPF(empregado.cpf));
      setRg(empregado.rg || '');
      setOrgaoExpedidor(empregado.orgaoExpedidor || '');
      setRgUF(empregado.rgUF || '');
      setRgDataEmissao(empregado.rgDataEmissao || '');
      setPis(empregado.pis || '');
      setDataNascimento(empregado.dataNascimento || '');
      setSexo(empregado.sexo || 'M');
      setEstadoCivil(empregado.estadoCivil || 'SOLTEIRO');
      setNacionalidade(empregado.nacionalidade || 'Brasileira');
      setNaturalidade(empregado.naturalidade || '');
      setNaturalidadeUF(empregado.naturalidadeUF || '');
      setEtniaRaca(empregado.etniaRaca || '');
      setGrauInstrucao(empregado.grauInstrucao || '');
      setNomeMae(empregado.nomeMae || '');
      setNomePai(empregado.nomePai || '');
      setEmail(empregado.email || '');
      setTelefone(empregado.telefone || '');

      setCtpsNumero(empregado.ctpsNumero || '');
      setCtpsSerie(empregado.ctpsSerie || '');
      setCtpsDV(empregado.ctpsDV || '');
      setCtpsUF(empregado.ctpsUF || '');
      setCtpsDataEmissao(empregado.ctpsDataEmissao || '');
      setTituloEleitor(empregado.tituloEleitor || '');
      setTituloZona(empregado.tituloZona || '');
      setTituloSecao(empregado.tituloSecao || '');
      setCnh(empregado.cnh || '');
      setCnhCategoria(empregado.cnhCategoria || '');
      setCnhValidade(empregado.cnhValidade || '');

      setLogradouro(empregado.endereco?.logradouro || '');
      setNumero(empregado.endereco?.numero || '');
      setComplemento(empregado.endereco?.complemento || '');
      setBairro(empregado.endereco?.bairro || '');
      setCidade(empregado.endereco?.cidade || '');
      setUf(empregado.endereco?.uf || '');
      setCep(empregado.endereco?.cep || '');

      setBanco(empregado.dadosBancarios?.banco || '');
      setCodigoBanco(empregado.dadosBancarios?.codigoBanco || '');
      setAgencia(empregado.dadosBancarios?.agencia || '');
      setConta(empregado.dadosBancarios?.conta || '');
      setTipoConta(empregado.dadosBancarios?.tipoConta || 'CORRENTE');
      setChavePix(empregado.dadosBancarios?.chavePix || '');

      setDataAdmissao(empregado.dataAdmissao || '');
      setVinculo(empregado.vinculo || 'CLT');
      setTipoContrato(empregado.tipoContrato || 'INDETERMINADO');
      setStatusVinculo(empregado.status || 'ativo');
      setCargo(empregado.cargo || '');
      setCbo(empregado.cbo || '');
      setDepartamento(empregado.departamento || '');
      setCentroDeCusto(empregado.centroDeCusto || '');
      setSalarioBase(empregado.salarioBase || 0);
      setTipoSalario(empregado.tipoSalario || 'MENSALISTA');
      setJornadaHorasSemanais(empregado.jornadaHorasSemanais || 44);
      setDivisorHoras(empregado.divisorHoras || 220);
      setEscala(empregado.escala || '');
      setOptanteFGTS(empregado.optanteFGTS !== false);
      setAliquotaFGTS(empregado.aliquotaFGTS ?? 0.08);
      setAdicionalPericulosidade(Boolean(empregado.adicionalPericulosidade));
      setAdicionalInsalubridade(empregado.adicionalInsalubridade || 'NENHUMA');
      setPensaoAlimenticiaPercentual(empregado.pensaoAlimenticiaPercentual || 0);
      setPensaoAlimenticiaValorFixo(empregado.pensaoAlimenticiaValorFixo || 0);
      setCategoriaTrabalhador(empregado.categoriaTrabalhador || '01 - Empregado');
      setCodigoSindical(empregado.codigoSindical || '');
      setSindicatoLaboral(empregado.sindicatoLaboral || '');

      setDependentes((empregado.dependentes || []).map(d => ({ ...d })));
      setBeneficios((empregado.beneficios || []).map(b => ({ ...b })));

      setNovoValorAlteracao(String(empregado.salarioBase || 0));
    }
    setModo(modoInicial);
    setAbaEdicao('PESSOAL');
    setStatusMsg(null);
    setErroExclusao(null);
  }, [empregado, modoInicial, isOpen]);

  if (!isOpen || !empregado) return null;

  const abrirEdicaoNaSecao = (secao: AbaEdicaoFicha) => {
    setAbaEdicao(secao);
    setModo('EDICAO');
    setStatusMsg(null);
  };

  const handleAdicionarDependente = () => {
    setDependentes(prev => [
      ...prev,
      {
        id: `dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nome: '',
        parentesco: 'FILHO',
        dataNascimento: '',
        cpf: '',
        irrf: true,
        salarioFamilia: true,
      },
    ]);
  };

  const handleAdicionarBeneficio = () => {
    setBeneficios(prev => [
      ...prev,
      {
        id: `ben-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nome: 'Vale Transporte',
        tipo: 'VALE_TRANSPORTE',
        valorBeneficio: 0,
        descontoEmpregado: 0,
        percentualDesconto: 6,
        ativo: true,
      },
    ]);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!nomeCompleto.trim()) {
      setStatusMsg({ texto: 'Nome completo é obrigatório.', erro: true });
      setAbaEdicao('PESSOAL');
      return;
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length === 11 && !validarCPF(cpfLimpo)) {
      setStatusMsg({ texto: 'CPF informado é inválido.', erro: true });
      setAbaEdicao('PESSOAL');
      return;
    }

    try {
      setSalvando(true);
      await api.salvarEmpregado({
        id: empregado.id,
        empresaId: empregado.empresaId,
        matricula: matricula.trim() || empregado.matricula,
        nomeCompleto: nomeCompleto.trim(),
        cpf: cpfLimpo || empregado.cpf,
        rg: rg.trim(),
        orgaoExpedidor: orgaoExpedidor.trim(),
        rgUF: rgUF.trim().toUpperCase(),
        rgDataEmissao,
        pis: pis.trim(),
        dataNascimento,
        sexo,
        estadoCivil,
        nacionalidade: nacionalidade.trim() || 'Brasileira',
        naturalidade: naturalidade.trim(),
        naturalidadeUF: naturalidadeUF.trim().toUpperCase(),
        etniaRaca: etniaRaca.trim(),
        grauInstrucao: grauInstrucao.trim(),
        nomeMae: nomeMae.trim(),
        nomePai: nomePai.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        ctpsNumero: ctpsNumero.trim(),
        ctpsSerie: ctpsSerie.trim(),
        ctpsDV: ctpsDV.trim(),
        ctpsUF: ctpsUF.trim().toUpperCase(),
        ctpsDataEmissao,
        tituloEleitor: tituloEleitor.trim(),
        tituloZona: tituloZona.trim(),
        tituloSecao: tituloSecao.trim(),
        cnh: cnh.trim(),
        cnhCategoria: cnhCategoria.trim().toUpperCase(),
        cnhValidade,
        endereco: {
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento.trim(),
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          uf: uf.trim().toUpperCase(),
          cep: cep.trim(),
        },
        dadosBancarios: {
          banco: banco.trim(),
          codigoBanco: codigoBanco.trim(),
          agencia: agencia.trim(),
          conta: conta.trim(),
          tipoConta,
          chavePix: chavePix.trim(),
        },
        dataAdmissao,
        vinculo,
        tipoContrato,
        status: statusVinculo,
        cargo: cargo.trim(),
        cbo: cbo.trim(),
        departamento: departamento.trim(),
        centroDeCusto: centroDeCusto.trim(),
        salarioBase: Number(salarioBase) || 0,
        tipoSalario,
        jornadaHorasSemanais: Number(jornadaHorasSemanais) || 44,
        divisorHoras: Number(divisorHoras) || 220,
        escala: escala.trim(),
        optanteFGTS,
        aliquotaFGTS: vinculo === 'APRENDIZ' ? 0.02 : Number(aliquotaFGTS) || 0.08,
        adicionalPericulosidade,
        adicionalInsalubridade,
        pensaoAlimenticiaPercentual: Number(pensaoAlimenticiaPercentual) || 0,
        pensaoAlimenticiaValorFixo: Number(pensaoAlimenticiaValorFixo) || 0,
        categoriaTrabalhador: categoriaTrabalhador.trim(),
        codigoSindical: codigoSindical.trim(),
        sindicatoLaboral: sindicatoLaboral.trim(),
        dependentes: dependentes.filter(d => d.nome.trim() !== ''),
        beneficios: beneficios.filter(b => b.nome.trim() !== ''),
      });

      setStatusMsg({ texto: 'Alterações da ficha cadastral salvas com sucesso!' });
      onEmpregadoAtualizado();
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

  const inputClass =
    'w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40';
  const labelClass = 'block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {empregado.nomeCompleto}
                </span>
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {empresa.razaoSocial} · {empregado.cargo} · Salário {formatarMoeda(empregado.salarioBase)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Modos Principais */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2 text-xs">
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
            onClick={() => {
              setModo('EDICAO');
              setStatusMsg(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
              modo === 'EDICAO'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Alterar Ficha Cadastral
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
            Alteração com Vigência
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
              modo === 'EXCLUSAO' ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold' : ''
            }`}
          >
            Excluir Vínculo
          </button>
        </div>

        {/* Conteúdo Scrollável */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                statusMsg.erro
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              }`}
            >
              {statusMsg.erro ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.texto}</span>
            </div>
          )}

          {/* MODO 1: CONSULTA COMPLETA DA FICHA CADASTRAL (COM ATALHOS DE ALTERAÇÃO) */}
          {modo === 'CONSULTA' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl px-4 py-2.5">
                <span className="text-xs text-blue-900 dark:text-blue-200 font-medium">
                  Ficha completa de registro do colaborador. Clique em <strong>Alterar</strong> em qualquer bloco para editar os dados cadastrais, bancários, contratuais, dependentes ou benefícios.
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => gerarRegistroEmpregadoPDF(empresa, empregado)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Ficha PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirEdicaoNaSecao('PESSOAL')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Alterar Ficha Cadastral
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bloco Pessoal & Documentos */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      Dados Pessoais &amp; Documentação
                    </h4>
                    <button
                      type="button"
                      onClick={() => abrirEdicaoNaSecao('PESSOAL')}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Alterar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-400 block">CPF:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatarCPF(empregado.cpf)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">RG / Órgão:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {empregado.rg || '-'} {empregado.orgaoExpedidor ? `(${empregado.orgaoExpedidor})` : ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">PIS / PASEP:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{empregado.pis || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Nascimento / Sexo:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatarData(empregado.dataNascimento)} · {empregado.sexo}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">CTPS (Nº / Série / UF):</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {empregado.ctpsNumero ? `${empregado.ctpsNumero} / ${empregado.ctpsSerie || '-'} / ${empregado.ctpsUF || '-'}` : 'CTPS Digital'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Estado Civil / Instrução:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {empregado.estadoCivil} {empregado.grauInstrucao ? `· ${empregado.grauInstrucao}` : ''}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block">Filiação (Mãe / Pai):</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {empregado.nomeMae || '-'} / {empregado.nomePai || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">E-mail:</span>
                      <span className="truncate block text-slate-800 dark:text-slate-200">{empregado.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Telefone:</span>
                      <span className="text-slate-800 dark:text-slate-200">{empregado.telefone || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Bloco Contratual & Incidências */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      Contrato, Lotação &amp; Incidências
                    </h4>
                    <button
                      type="button"
                      onClick={() => abrirEdicaoNaSecao('CONTRATO')}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Alterar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Admissão:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatarData(empregado.dataAdmissao)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Vínculo / Contrato:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {empregado.vinculo} · {empregado.tipoContrato === 'INDETERMINADO' ? 'Indeterminado' : empregado.tipoContrato}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Salário Base:</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                        {formatarMoeda(empregado.salarioBase)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">CBO / Tipo:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {empregado.cbo || '-'} · {empregado.tipoSalario}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Departamento / C. Custo:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {empregado.departamento || 'Geral'} {empregado.centroDeCusto ? `(${empregado.centroDeCusto})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Jornada / Divisor:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {empregado.jornadaHorasSemanais}h/sem (Div. {empregado.divisorHoras})
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block">Escala de Trabalho:</span>
                      <span className="text-slate-800 dark:text-slate-200">{empregado.escala || '44h semanais'}</span>
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                        FGTS: {empregado.optanteFGTS !== false ? `${((empregado.aliquotaFGTS || 0.08) * 100).toFixed(0)}%` : 'Não optante'}
                      </span>
                      {empregado.adicionalPericulosidade && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                          Periculosidade 30%
                        </span>
                      )}
                      {empregado.adicionalInsalubridade && empregado.adicionalInsalubridade !== 'NENHUMA' && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                          Insalubridade ({empregado.adicionalInsalubridade})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bloco Endereço & Dados Bancários */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Endereço &amp; Conta Bancária
                    </h4>
                    <button
                      type="button"
                      onClick={() => abrirEdicaoNaSecao('ENDERECO_BANCO')}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Alterar
                    </button>
                  </div>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Endereço Residencial:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {empregado.endereco?.logradouro || '-'}
                        {empregado.endereco?.numero ? `, ${empregado.endereco.numero}` : ''}
                        {empregado.endereco?.complemento ? ` (${empregado.endereco.complemento})` : ''}
                      </span>
                      <span className="block text-[11px]">
                        {empregado.endereco?.bairro || ''} · {empregado.endereco?.cidade || ''}/{empregado.endereco?.uf || ''} · CEP {formatarCEP(empregado.endereco?.cep || '')}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-slate-200/70 dark:border-slate-700/70">
                      <span className="text-[10px] text-slate-400 block">Dados Bancários para Pagamento:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {empregado.dadosBancarios?.banco || '-'} ({empregado.dadosBancarios?.codigoBanco || '-'}) · Ag. {empregado.dadosBancarios?.agencia || '-'} · Cc {empregado.dadosBancarios?.conta || '-'} ({empregado.dadosBancarios?.tipoConta || 'CORRENTE'})
                      </span>
                      {empregado.dadosBancarios?.chavePix && (
                        <span className="block text-[11px] font-mono text-slate-500">PIX: {empregado.dadosBancarios.chavePix}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bloco Dependentes & Benefícios */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-teal-600" />
                      Dependentes &amp; Benefícios
                    </h4>
                    <button
                      type="button"
                      onClick={() => abrirEdicaoNaSecao('DEPENDENTES_BENEFICIOS')}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Alterar
                    </button>
                  </div>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Dependentes ({empregado.dependentes?.length || 0}):</span>
                      {(!empregado.dependentes || empregado.dependentes.length === 0) ? (
                        <span className="italic text-[11px]">Nenhum dependente cadastrado.</span>
                      ) : (
                        <ul className="space-y-1 mt-0.5">
                          {empregado.dependentes.map(dep => (
                            <li key={dep.id} className="text-[11px] text-slate-800 dark:text-slate-200 flex items-center justify-between">
                              <span>{dep.nome} ({dep.parentesco})</span>
                              <span className="text-[10px] text-slate-500">
                                {dep.irrf ? 'IRRF ' : ''}{dep.salarioFamilia ? 'Sal-Fam' : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="pt-1 border-t border-slate-200/70 dark:border-slate-700/70">
                      <span className="text-[10px] text-slate-400 block">Benefícios Ativos ({(empregado.beneficios || []).filter(b => b.ativo).length}):</span>
                      {(!empregado.beneficios || empregado.beneficios.length === 0) ? (
                        <span className="italic text-[11px]">Nenhum benefício cadastrado.</span>
                      ) : (
                        <ul className="space-y-1 mt-0.5">
                          {empregado.beneficios.map(ben => (
                            <li key={ben.id} className="text-[11px] text-slate-800 dark:text-slate-200 flex items-center justify-between">
                              <span>{ben.nome} {!ben.ativo && '(Inativo)'}</span>
                              <span className="font-mono">{formatarMoeda(ben.valorBeneficio)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
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
                      <div key={hist.id} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {hist.tipo}: {hist.valorAnterior} → {hist.valorNovo}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                            Vigência: <strong>{formatarData(hist.dataVigencia)}</strong> · Motivo: {hist.motivo}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          Registrado em {formatarData(hist.dataRegistro)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODO 2: EDIÇÃO COMPLETA DA FICHA CADASTRAL */}
          {modo === 'EDICAO' && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              {/* Sub-abas de Edição */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
                {(
                  [
                    { id: 'PESSOAL' as const, label: '1. Pessoal & Documentos', icon: User },
                    { id: 'ENDERECO_BANCO' as const, label: '2. Endereço & Banco', icon: Landmark },
                    { id: 'CONTRATO' as const, label: '3. Contrato & Incidências', icon: Briefcase },
                    { id: 'DEPENDENTES_BENEFICIOS' as const, label: '4. Dependentes & Benefícios', icon: HeartHandshake },
                  ]
                ).map(tab => {
                  const Icon = tab.icon;
                  const ativo = abaEdicao === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAbaEdicao(tab.id)}
                      className={`flex-1 min-w-[155px] py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                        ativo
                          ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* SUB-ABA 1: PESSOAL & DOCUMENTOS */}
              {abaEdicao === 'PESSOAL' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={nomeCompleto}
                        onChange={e => setNomeCompleto(e.target.value)}
                        className={`${inputClass} font-semibold`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Matrícula</label>
                      <input
                        type="text"
                        value={matricula}
                        onChange={e => setMatricula(e.target.value)}
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>CPF *</label>
                      <input
                        type="text"
                        required
                        value={cpf}
                        onChange={e => setCpf(formatarCPF(e.target.value))}
                        maxLength={14}
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={labelClass}>Data de Nascimento</label>
                      <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Sexo</label>
                      <select value={sexo} onChange={e => setSexo(e.target.value as any)} className={inputClass}>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Estado Civil</label>
                      <select value={estadoCivil} onChange={e => setEstadoCivil(e.target.value as any)} className={inputClass}>
                        <option value="SOLTEIRO">Solteiro(a)</option>
                        <option value="CASADO">Casado(a)</option>
                        <option value="UNIAO_ESTAVEL">União Estável</option>
                        <option value="DIVORCIADO">Divorciado(a)</option>
                        <option value="VIUVO">Viúvo(a)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Nacionalidade</label>
                      <input type="text" value={nacionalidade} onChange={e => setNacionalidade(e.target.value)} className={inputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={labelClass}>Naturalidade</label>
                      <input type="text" value={naturalidade} onChange={e => setNaturalidade(e.target.value)} placeholder="Cidade natal" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>UF Natal</label>
                      <input type="text" maxLength={2} value={naturalidadeUF} onChange={e => setNaturalidadeUF(e.target.value)} placeholder="SP" className={`${inputClass} uppercase`} />
                    </div>
                    <div>
                      <label className={labelClass}>Etnia / Raça</label>
                      <input type="text" value={etniaRaca} onChange={e => setEtniaRaca(e.target.value)} placeholder="Ex: Parda, Branca..." className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Grau de Instrução</label>
                      <input type="text" value={grauInstrucao} onChange={e => setGrauInstrucao(e.target.value)} placeholder="Ensino Médio / Superior" className={inputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Nome da Mãe</label>
                      <input type="text" value={nomeMae} onChange={e => setNomeMae(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Nome do Pai</label>
                      <input type="text" value={nomePai} onChange={e => setNomePai(e.target.value)} className={inputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>E-mail</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Telefone / WhatsApp</label>
                      <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className={inputClass} />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                      Documentos Oficiais (RG, PIS, CTPS, Título e CNH)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className={labelClass}>RG</label>
                        <input type="text" value={rg} onChange={e => setRg(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Órgão Exp.</label>
                        <input type="text" value={orgaoExpedidor} onChange={e => setOrgaoExpedidor(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>UF RG</label>
                        <input type="text" maxLength={2} value={rgUF} onChange={e => setRgUF(e.target.value)} className={`${inputClass} uppercase`} />
                      </div>
                      <div>
                        <label className={labelClass}>Emissão RG</label>
                        <input type="date" value={rgDataEmissao} onChange={e => setRgDataEmissao(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>PIS / PASEP</label>
                        <input type="text" value={pis} onChange={e => setPis(e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className={labelClass}>CTPS Número</label>
                        <input type="text" value={ctpsNumero} onChange={e => setCtpsNumero(e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                      <div>
                        <label className={labelClass}>Série</label>
                        <input type="text" value={ctpsSerie} onChange={e => setCtpsSerie(e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                      <div>
                        <label className={labelClass}>DV</label>
                        <input type="text" value={ctpsDV} onChange={e => setCtpsDV(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>UF CTPS</label>
                        <input type="text" maxLength={2} value={ctpsUF} onChange={e => setCtpsUF(e.target.value)} className={`${inputClass} uppercase`} />
                      </div>
                      <div>
                        <label className={labelClass}>Emissão CTPS</label>
                        <input type="date" value={ctpsDataEmissao} onChange={e => setCtpsDataEmissao(e.target.value)} className={inputClass} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Título de Eleitor</label>
                        <input type="text" value={tituloEleitor} onChange={e => setTituloEleitor(e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                      <div>
                        <label className={labelClass}>Zona</label>
                        <input type="text" value={tituloZona} onChange={e => setTituloZona(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Seção</label>
                        <input type="text" value={tituloSecao} onChange={e => setTituloSecao(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>CNH</label>
                        <input type="text" value={cnh} onChange={e => setCnh(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Cat. CNH</label>
                        <input type="text" value={cnhCategoria} onChange={e => setCnhCategoria(e.target.value)} placeholder="AB" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 2: ENDEREÇO & DADOS BANCÁRIOS */}
              {abaEdicao === 'ENDERECO_BANCO' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      Endereço Residencial Completo
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Logradouro</label>
                        <input type="text" value={logradouro} onChange={e => setLogradouro(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Número</label>
                        <input type="text" value={numero} onChange={e => setNumero(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Complemento</label>
                        <input type="text" value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Apto / Bloco" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Bairro</label>
                        <input type="text" value={bairro} onChange={e => setBairro(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Cidade</label>
                        <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>UF</label>
                        <input type="text" maxLength={2} value={uf} onChange={e => setUf(e.target.value)} className={`${inputClass} uppercase`} />
                      </div>
                      <div>
                        <label className={labelClass}>CEP</label>
                        <input type="text" value={cep} onChange={e => setCep(e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                      Dados Bancários &amp; PIX (Impressos no Recibo de Pagamento)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Instituição Bancária</label>
                        <input type="text" value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ex: Itaú / Banco do Brasil / Nubank" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Código do Banco</label>
                        <input type="text" value={codigoBanco} onChange={e => setCodigoBanco(e.target.value)} placeholder="341" className={`${inputClass} font-mono`} />
                      </div>
                      <div>
                        <label className={labelClass}>Agência</label>
                        <input type="text" value={agencia} onChange={e => setAgencia(e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                      <div>
                        <label className={labelClass}>Conta</label>
                        <input type="text" value={conta} onChange={e => setConta(e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                      <div>
                        <label className={labelClass}>Tipo de Conta</label>
                        <select value={tipoConta} onChange={e => setTipoConta(e.target.value as any)} className={inputClass}>
                          <option value="CORRENTE">Conta Corrente</option>
                          <option value="POUPANCA">Conta Poupança</option>
                          <option value="SALARIO">Conta Salário</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className={labelClass}>Chave PIX</label>
                        <input type="text" value={chavePix} onChange={e => setChavePix(e.target.value)} placeholder="CPF, E-mail, Celular ou Chave Aleatória" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 3: CONTRATO, CARGO & INCIDÊNCIAS */}
              {abaEdicao === 'CONTRATO' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={labelClass}>Data de Admissão</label>
                      <input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} className={`${inputClass} font-mono`} />
                    </div>
                    <div>
                      <label className={labelClass}>Vínculo Empregatício</label>
                      <select
                        value={vinculo}
                        onChange={e => {
                          const v = e.target.value as VinculoEmpregaticio;
                          setVinculo(v);
                          if (v === 'APRENDIZ') setAliquotaFGTS(0.02);
                          else if (v === 'CLT') setAliquotaFGTS(0.08);
                        }}
                        className={inputClass}
                      >
                        <option value="CLT">CLT</option>
                        <option value="APRENDIZ">Jovem Aprendiz</option>
                        <option value="ESTAGIO">Estágio</option>
                        <option value="DIRETOR_ESTATUTARIO">Diretor Estatutário</option>
                        <option value="PJ">PJ / Prestador</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Modalidade Contratual</label>
                      <select value={tipoContrato} onChange={e => setTipoContrato(e.target.value as any)} className={inputClass}>
                        <option value="INDETERMINADO">Prazo Indeterminado</option>
                        <option value="EXPERIENCIA_45_45">Experiência (45+45d)</option>
                        <option value="DETERMINADO">Prazo Determinado</option>
                        <option value="TEMPORARIO">Temporário</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Situação / Status</label>
                      <select value={statusVinculo} onChange={e => setStatusVinculo(e.target.value as any)} className={inputClass}>
                        <option value="ativo">Ativo</option>
                        <option value="em_admissao">Em Admissão</option>
                        <option value="ferias">Em Férias</option>
                        <option value="afastado">Afastado</option>
                        <option value="desligado">Desligado</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Cargo / Função</label>
                      <input type="text" value={cargo} onChange={e => setCargo(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>CBO</label>
                      <input type="text" value={cbo} onChange={e => setCbo(e.target.value)} className={`${inputClass} font-mono`} />
                    </div>
                    <div>
                      <label className={labelClass}>Departamento / Setor</label>
                      <input type="text" value={departamento} onChange={e => setDepartamento(e.target.value)} className={inputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={labelClass}>Centro de Custo / Lotação</label>
                      <input type="text" value={centroDeCusto} onChange={e => setCentroDeCusto(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Salário Base (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={salarioBase}
                        onChange={e => setSalarioBase(Number(e.target.value))}
                        className={`${inputClass} font-mono font-bold text-emerald-700 dark:text-emerald-400`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Forma de Remuneração</label>
                      <select value={tipoSalario} onChange={e => setTipoSalario(e.target.value as any)} className={inputClass}>
                        <option value="MENSALISTA">Mensalista</option>
                        <option value="HORISTA">Horista</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Jornada Semanal / Divisor</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={jornadaHorasSemanais}
                          onChange={e => setJornadaHorasSemanais(Number(e.target.value))}
                          className={`${inputClass} text-center`}
                          title="Horas semanais"
                        />
                        <input
                          type="number"
                          value={divisorHoras}
                          onChange={e => setDivisorHoras(Number(e.target.value))}
                          className={`${inputClass} text-center font-mono`}
                          title="Divisor mensal (ex: 220)"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Escala / Horário de Trabalho</label>
                    <input
                      type="text"
                      value={escala}
                      onChange={e => setEscala(e.target.value)}
                      placeholder="Ex: Segunda a Sexta (08:00 às 17:48)"
                      className={inputClass}
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                      Incidências Trabalhistas, Adicionais e Sindicato
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 py-2">
                        <input
                          type="checkbox"
                          checked={optanteFGTS}
                          onChange={e => setOptanteFGTS(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        Optante FGTS
                      </label>
                      <div>
                        <label className={labelClass}>Alíquota FGTS</label>
                        <select
                          value={aliquotaFGTS}
                          onChange={e => setAliquotaFGTS(Number(e.target.value))}
                          disabled={!optanteFGTS}
                          className={inputClass}
                        >
                          <option value={0.08}>8% (Padrão CLT)</option>
                          <option value={0.02}>2% (Jovem Aprendiz)</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 py-2">
                        <input
                          type="checkbox"
                          checked={adicionalPericulosidade}
                          onChange={e => setAdicionalPericulosidade(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        Periculosidade (30%)
                      </label>
                      <div>
                        <label className={labelClass}>Insalubridade</label>
                        <select
                          value={adicionalInsalubridade}
                          onChange={e => setAdicionalInsalubridade(e.target.value as any)}
                          className={inputClass}
                        >
                          <option value="NENHUMA">Não se aplica</option>
                          <option value="MINIMO_10">Grau Mínimo (10% s/ SM)</option>
                          <option value="MEDIO_20">Grau Médio (20% s/ SM)</option>
                          <option value="MAXIMO_40">Grau Máximo (40% s/ SM)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className={labelClass}>Pensão Alimentícia (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          value={pensaoAlimenticiaPercentual}
                          onChange={e => setPensaoAlimenticiaPercentual(Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Pensão Valor Fixo (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={pensaoAlimenticiaValorFixo}
                          onChange={e => setPensaoAlimenticiaValorFixo(Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Categoria Trabalhador</label>
                        <input type="text" value={categoriaTrabalhador} onChange={e => setCategoriaTrabalhador(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Código Sindical</label>
                        <input type="text" value={codigoSindical} onChange={e => setCodigoSindical(e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                      <div className="sm:col-span-4">
                        <label className={labelClass}>Sindicato Laboral</label>
                        <input type="text" value={sindicatoLaboral} onChange={e => setSindicatoLaboral(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 4: DEPENDENTES & BENEFÍCIOS */}
              {abaEdicao === 'DEPENDENTES_BENEFICIOS' && (
                <div className="space-y-5">
                  {/* Dependentes */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          Dependentes (IRRF &amp; Salário-Família)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Cada dependente elegível deduz R$ 189,59 no IRRF e/ou gera cota de Salário-Família (R$ 67,54).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAdicionarDependente}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Dependente
                      </button>
                    </div>

                    {dependentes.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Nenhum dependente cadastrado para este colaborador.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {dependentes.map((dep, idx) => (
                          <div
                            key={dep.id}
                            className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end"
                          >
                            <div className="sm:col-span-2">
                              <label className={labelClass}>Nome do Dependente</label>
                              <input
                                type="text"
                                value={dep.nome}
                                onChange={e => {
                                  const next = [...dependentes];
                                  next[idx] = { ...dep, nome: e.target.value };
                                  setDependentes(next);
                                }}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Parentesco</label>
                              <select
                                value={dep.parentesco}
                                onChange={e => {
                                  const next = [...dependentes];
                                  next[idx] = { ...dep, parentesco: e.target.value as any };
                                  setDependentes(next);
                                }}
                                className={inputClass}
                              >
                                <option value="FILHO">Filho(a)</option>
                                <option value="CONJUGE">Cônjuge</option>
                                <option value="ENTEADO">Enteado(a)</option>
                                <option value="PAIS">Pais</option>
                                <option value="OUTRO">Outro</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Nascimento</label>
                              <input
                                type="date"
                                value={dep.dataNascimento}
                                onChange={e => {
                                  const next = [...dependentes];
                                  next[idx] = { ...dep, dataNascimento: e.target.value };
                                  setDependentes(next);
                                }}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>CPF</label>
                              <input
                                type="text"
                                value={dep.cpf}
                                onChange={e => {
                                  const next = [...dependentes];
                                  next[idx] = { ...dep, cpf: e.target.value };
                                  setDependentes(next);
                                }}
                                className={`${inputClass} font-mono`}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2 pb-1">
                              <div className="space-y-1 text-[11px]">
                                <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                  <input
                                    type="checkbox"
                                    checked={dep.irrf}
                                    onChange={e => {
                                      const next = [...dependentes];
                                      next[idx] = { ...dep, irrf: e.target.checked };
                                      setDependentes(next);
                                    }}
                                  />
                                  IRRF
                                </label>
                                <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                  <input
                                    type="checkbox"
                                    checked={dep.salarioFamilia}
                                    onChange={e => {
                                      const next = [...dependentes];
                                      next[idx] = { ...dep, salarioFamilia: e.target.checked };
                                      setDependentes(next);
                                    }}
                                  />
                                  Sal. Fam.
                                </label>
                              </div>
                              <button
                                type="button"
                                onClick={() => setDependentes(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                                title="Remover dependente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Benefícios */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          Benefícios Contratuais &amp; Descontos em Folha
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Vale Transporte limitado a 6% do salário base e Vale Refeição (PAT até 20%).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAdicionarBeneficio}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Benefício
                      </button>
                    </div>

                    {beneficios.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Nenhum benefício vinculado a este colaborador.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {beneficios.map((ben, idx) => (
                          <div
                            key={ben.id}
                            className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end"
                          >
                            <div className="sm:col-span-2">
                              <label className={labelClass}>Descrição</label>
                              <input
                                type="text"
                                value={ben.nome}
                                onChange={e => {
                                  const next = [...beneficios];
                                  next[idx] = { ...ben, nome: e.target.value };
                                  setBeneficios(next);
                                }}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Tipo</label>
                              <select
                                value={ben.tipo}
                                onChange={e => {
                                  const next = [...beneficios];
                                  next[idx] = { ...ben, tipo: e.target.value as any };
                                  setBeneficios(next);
                                }}
                                className={inputClass}
                              >
                                <option value="VALE_TRANSPORTE">Vale Transporte</option>
                                <option value="VALE_REFEICAO">Vale Refeição</option>
                                <option value="PLANO_SAUDE">Plano de Saúde</option>
                                <option value="SEGURO_VIDA">Seguro de Vida</option>
                                <option value="OUTRO">Outro</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Valor Benefício (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={ben.valorBeneficio}
                                onChange={e => {
                                  const next = [...beneficios];
                                  next[idx] = { ...ben, valorBeneficio: Number(e.target.value) };
                                  setBeneficios(next);
                                }}
                                className={`${inputClass} font-mono`}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Desconto Colab. (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={ben.descontoEmpregado}
                                onChange={e => {
                                  const next = [...beneficios];
                                  next[idx] = { ...ben, descontoEmpregado: Number(e.target.value) };
                                  setBeneficios(next);
                                }}
                                className={`${inputClass} font-mono`}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2 pb-1.5">
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                                <input
                                  type="checkbox"
                                  checked={ben.ativo}
                                  onChange={e => {
                                    const next = [...beneficios];
                                    next[idx] = { ...ben, ativo: e.target.checked };
                                    setBeneficios(next);
                                  }}
                                />
                                Ativo
                              </label>
                              <button
                                type="button"
                                onClick={() => setBeneficios(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                                title="Remover benefício"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModo('CONSULTA')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Voltar à Consulta
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {salvando ? 'Salvando Ficha...' : 'Salvar Alterações na Ficha Cadastral'}
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
                    <label className={labelClass}>Tipo de Alteração</label>
                    <select
                      value={tipoAlteracao}
                      onChange={e => setTipoAlteracao(e.target.value as any)}
                      className={`${inputClass} font-semibold`}
                    >
                      <option value="SALARIO">Reajuste / Aumento Salarial</option>
                      <option value="CARGO">Promoção / Mudança de Cargo</option>
                      <option value="JORNADA">Alteração de Jornada / Escala</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Data de Vigência <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dataVigencia}
                      onChange={e => setDataVigencia(e.target.value)}
                      className={`${inputClass} font-mono font-bold`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
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
                      className={`${inputClass} font-bold`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Motivo / Justificativa Legal</label>
                    <input
                      type="text"
                      required
                      value={motivoAlteracao}
                      onChange={e => setMotivoAlteracao(e.target.value)}
                      placeholder="Ex: Dissídio coletivo / Mérito / Promoção técnica"
                      className={inputClass}
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
                    <label className={labelClass}>
                      Data do Desligamento (Afastamento) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dataDesligamento}
                      onChange={e => setDataDesligamento(e.target.value)}
                      className={`${inputClass} font-mono font-bold`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Motivo do Desligamento</label>
                    <select
                      value={motivoDesligamento}
                      onChange={e => setMotivoDesligamento(e.target.value)}
                      className={`${inputClass} font-semibold`}
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
                    <label className={labelClass}>Observações Adicionais</label>
                    <textarea
                      rows={2}
                      value={observacoesDesligamento}
                      onChange={e => setObservacoesDesligamento(e.target.value)}
                      placeholder="Informações sobre cumprimento do aviso prévio, devolução de equipamentos, etc."
                      className={inputClass}
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
