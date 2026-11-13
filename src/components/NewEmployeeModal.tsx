import React, { useState } from 'react';
import { Empregado, Empresa, VinculoEmpregaticio } from '../types/dp';
import { api } from '../services/api';
import { X, UserPlus, CheckCircle2, FileText, UserCheck } from 'lucide-react';
import { gerarContratoTrabalhoPDF, gerarDocumentosAdmissaoConjuntoPDF } from '../utils/pdfGenerator';
import { validarCPF } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa;
  onEmpregadoCriado: (emp: Empregado) => void;
}

export const NewEmployeeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresa,
  onEmpregadoCriado,
}) => {
  const [etapa, setEtapa] = useState<'DADOS_PESSOAIS' | 'VINCULO_CONTRATO' | 'DOCUMENTOS_CHECKLIST'>('DADOS_PESSOAIS');
  const [carregando, setCarregando] = useState(false);

  // Form states
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [orgaoExpedidor, setOrgaoExpedidor] = useState('SSP/SP');
  const [pis, setPis] = useState('');
  const [dataNascimento, setDataNascimento] = useState('1998-05-10');
  const [sexo, setSexo] = useState<'M' | 'F' | 'OUTRO'>('M');
  const [estadoCivil, setEstadoCivil] = useState<'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'UNIAO_ESTAVEL' | 'VIUVO'>('SOLTEIRO');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  // Endereço
  const [logradouro, setLogradouro] = useState('Rua das Flores');
  const [numero, setNumero] = useState('100');
  const [bairro, setBairro] = useState('Centro');
  const [cidade, setCidade] = useState('São Paulo');
  const [uf, setUf] = useState('SP');
  const [cep, setCep] = useState('01001-000');

  // Vínculo & Cargo
  const [vinculo, setVinculo] = useState<VinculoEmpregaticio>('CLT');
  const [tipoContrato, setTipoContrato] = useState<'INDETERMINADO' | 'EXPERIENCIA_45_45' | 'DETERMINADO' | 'TEMPORARIO'>('EXPERIENCIA_45_45');
  const [cargo, setCargo] = useState('Desenvolvedor Web');
  const [cbo, setCbo] = useState('2124-05');
  const [departamento, setDepartamento] = useState('Tecnologia');
  const [centroDeCusto, setCentroDeCusto] = useState('CC-01 TI & Inovação');
  const [salarioBase, setSalarioBase] = useState<number>(3800);
  const [jornadaHorasSemanais, setJornadaHorasSemanais] = useState<number>(40);
  const [divisorHoras, setDivisorHoras] = useState<number>(200);
  const [escala, setEscala] = useState('Segunda a Sexta (09:00 às 18:00)');
  const [dataPrevisaoInicio, setDataPrevisaoInicio] = useState(new Date().toISOString().split('T')[0]);

  // Benefícios
  const [optanteVT, setOptanteVT] = useState(true);
  const [valorVT, setValorVT] = useState(380);
  const [optanteVR, setOptanteVR] = useState(true);
  const [valorVR, setValorVR] = useState(700);

  // Dependentes
  const [temDependente, setTemDependente] = useState(false);
  const [nomeDependente, setNomeDependente] = useState('');
  const [cpfDependente, setCpfDependente] = useState('');

  // Documentos de admissão
  const [docsChecklist, setDocsChecklist] = useState<any[]>([
    { id: '1', nome: 'Documento de Identidade (RG/CNH)', tipo: 'RG', obrigatorio: true, recebido: true, status: 'validado' },
    { id: '2', nome: 'Cadastro de Pessoa Física (CPF)', tipo: 'CPF', obrigatorio: true, recebido: true, status: 'validado' },
    { id: '3', nome: 'Comprovante de Residência Atualizado', tipo: 'COMPROVANTE_RESIDENCIA', obrigatorio: true, recebido: true, status: 'validado' },
    { id: '4', nome: 'Atestado de Saúde Ocupacional (ASO Admissional)', tipo: 'EXAME_ADMISSIONAL_ASO', obrigatorio: true, recebido: true, status: 'validado' },
    { id: '5', nome: 'Carteira de Trabalho Digital (CTPS)', tipo: 'CTPS', obrigatorio: true, recebido: true, status: 'validado' },
  ]);

  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleDoc = (index: number) => {
    const novos = [...docsChecklist];
    novos[index].recebido = !novos[index].recebido;
    novos[index].status = novos[index].recebido ? 'validado' : 'pendente';
    setDocsChecklist(novos);
  };

  const handleSalvarEAdmitir = async (aprovarDiretamente: boolean) => {
    setErroValidacao(null);
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!nomeCompleto.trim() || !cpfLimpo) {
      setErroValidacao('Nome completo e CPF são campos obrigatórios.');
      setEtapa('DADOS_PESSOAIS');
      return;
    }
    if (!validarCPF(cpfLimpo)) {
      setErroValidacao('O CPF informado é inválido. Verifique os 11 dígitos.');
      setEtapa('DADOS_PESSOAIS');
      return;
    }

    try {
      setCarregando(true);

      const novoEmp: Partial<Empregado> = {
        empresaId: empresa.id,
        nomeCompleto,
        cpf: cpf.replace(/\D/g, ''),
        rg,
        orgaoExpedidor,
        pis: pis || '120.00000.00-0',
        dataNascimento,
        sexo,
        estadoCivil,
        nacionalidade: 'Brasileira',
        email: email || `${nomeCompleto.toLowerCase().replace(/\s+/g, '.')}@empresa.com.br`,
        telefone,
        endereco: { logradouro, numero, bairro, cidade, uf, cep },
        dadosBancarios: {
          banco: 'Banco do Brasil',
          codigoBanco: '001',
          agencia: '1001',
          conta: '20491-0',
          tipoConta: 'CORRENTE',
        },
        vinculo,
        status: aprovarDiretamente ? 'ativo' : 'em_admissao',
        dataAdmissao: dataPrevisaoInicio,
        dataPrevisaoInicio,
        cargo,
        cbo,
        departamento,
        centroDeCusto,
        salarioBase: Number(salarioBase),
        tipoSalario: 'MENSALISTA',
        jornadaHorasSemanais: Number(jornadaHorasSemanais),
        divisorHoras: Number(divisorHoras),
        escala,
        tipoContrato,
        dependentes: temDependente && nomeDependente ? [
          {
            id: `dep-${Date.now()}`,
            nome: nomeDependente,
            parentesco: 'FILHO',
            dataNascimento: '2022-01-01',
            cpf: cpfDependente || '000.0000.000-00',
            irrf: true,
            salarioFamilia: Number(salarioBase) <= 1819.26,
          }
        ] : [],
        beneficios: [
          ...(optanteVT ? [{
            id: `ben-vt`,
            nome: 'Vale Transporte',
            tipo: 'VALE_TRANSPORTE' as const,
            valorBeneficio: Number(valorVT),
            descontoEmpregado: Math.min(Number(salarioBase) * 0.06, Number(valorVT)),
            percentualDesconto: 6,
            ativo: true,
          }] : []),
          ...(optanteVR ? [{
            id: `ben-vr`,
            nome: 'Vale Refeição',
            tipo: 'VALE_REFEICAO' as const,
            valorBeneficio: Number(valorVR),
            descontoEmpregado: 35.0,
            ativo: true,
          }] : []),
        ],
        documentosAdmissao: docsChecklist,
        optanteFGTS: true,
        aliquotaFGTS: vinculo === 'APRENDIZ' ? 0.02 : 0.08,
      };

      const salvo = await api.salvarEmpregado(novoEmp);

      if (aprovarDiretamente) {
        await api.aprovarAdmissao(salvo.id, salvo);
        // Gera automaticamente o conjunto de documentos de admissão em PDF (Contrato + Registro)
        try {
          gerarDocumentosAdmissaoConjuntoPDF(empresa, salvo);
        } catch (pdfErr) {
          console.warn('Aviso ao gerar PDF de admissão:', pdfErr);
        }
      }

      onEmpregadoCriado(salvo);
      onClose();
    } catch (err: any) {
      const rawMsg = err?.message;
      const msgSegura =
        typeof rawMsg === 'string' && rawMsg.trim() && rawMsg !== '[object Object]'
          ? rawMsg
          : 'Erro ao registrar empregado. Verifique os dados informados.';
      setErroValidacao(msgSegura);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                  Nova Admissão
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{empresa.razaoSocial}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Ficha Cadastral Única do Trabalhador
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {erroValidacao && (
          <div className="mx-6 mt-4 p-3 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            {erroValidacao}
          </div>
        )}

        {/* Steps Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
          <button
            onClick={() => setEtapa('DADOS_PESSOAIS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              etapa === 'DADOS_PESSOAIS' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            1. Dados Pessoais e Endereço
          </button>
          <button
            onClick={() => setEtapa('VINCULO_CONTRATO')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              etapa === 'VINCULO_CONTRATO' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            2. Vínculo, Cargo, Salário e Benefícios
          </button>
          <button
            onClick={() => setEtapa('DOCUMENTOS_CHECKLIST')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              etapa === 'DOCUMENTOS_CHECKLIST' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            3. Checklist de Documentos & Aprovação
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {etapa === 'DADOS_PESSOAIS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gabriela Duarte Menezes"
                    value={nomeCompleto}
                    onChange={e => setNomeCompleto(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CPF *</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={e => setCpf(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RG</label>
                  <input
                    type="text"
                    placeholder="00.000.000-0"
                    value={rg}
                    onChange={e => setRg(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Órgão Expedidor</label>
                  <input
                    type="text"
                    value={orgaoExpedidor}
                    onChange={e => setOrgaoExpedidor(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIS / PASEP / NIT</label>
                  <input
                    type="text"
                    placeholder="000.00000.00-0"
                    value={pis}
                    onChange={e => setPis(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={e => setDataNascimento(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sexo</label>
                  <select
                    value={sexo}
                    onChange={e => setSexo(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado Civil</label>
                  <select
                    value={estadoCivil}
                    onChange={e => setEstadoCivil(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value="SOLTEIRO">Solteiro(a)</option>
                    <option value="CASADO">Casado(a)</option>
                    <option value="UNIAO_ESTAVEL">União Estável</option>
                    <option value="DIVORCIADO">Divorciado(a)</option>
                    <option value="VIUVO">Viúvo(a)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail Profissional</label>
                  <input
                    type="email"
                    placeholder="colaborador@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 90000-0000"
                    value={telefone}
                    onChange={e => setTelefone(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="pt-3 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Endereço Residencial do Trabalhador
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Logradouro</label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={e => setLogradouro(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Número</label>
                    <input
                      type="text"
                      value={numero}
                      onChange={e => setNumero(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={e => setBairro(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={e => setCidade(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">UF</label>
                    <input
                      type="text"
                      value={uf}
                      onChange={e => setUf(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">CEP</label>
                    <input
                      type="text"
                      value={cep}
                      onChange={e => setCep(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {etapa === 'VINCULO_CONTRATO' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vínculo Empregatício</label>
                  <select
                    value={vinculo}
                    onChange={e => setVinculo(e.target.value as VinculoEmpregaticio)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
                  >
                    <option value="CLT">CLT (Padrão Carteira Assinada)</option>
                    <option value="APRENDIZ">Jovem Aprendiz (Lei 10.097 - FGTS 2%)</option>
                    <option value="ESTAGIO">Estágio (Lei 11.788/08)</option>
                    <option value="DIRETOR_ESTATUTARIO">Diretor Estatutário / Pró-labore</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Modalidade Contratual</label>
                  <select
                    value={tipoContrato}
                    onChange={e => setTipoContrato(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value="EXPERIENCIA_45_45">Contrato de Experiência (45+45 dias)</option>
                    <option value="INDETERMINADO">Contrato por Prazo Indeterminado</option>
                    <option value="DETERMINADO">Contrato por Prazo Determinado</option>
                    <option value="TEMPORARIO">Trabalho Temporário (Lei 6.019)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data Prevista de Início</label>
                  <input
                    type="date"
                    value={dataPrevisaoInicio}
                    onChange={e => setDataPrevisaoInicio(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={e => setCargo(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CBO (Classif. Brasileira Ocupações)</label>
                  <input
                    type="text"
                    value={cbo}
                    onChange={e => setCbo(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={departamento}
                    onChange={e => setDepartamento(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salário Base Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salarioBase}
                    onChange={e => setSalarioBase(Number(e.target.value))}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jornada Semanal</label>
                  <select
                    value={jornadaHorasSemanais}
                    onChange={e => {
                      const h = Number(e.target.value);
                      setJornadaHorasSemanais(h);
                      setDivisorHoras(h === 44 ? 220 : h === 40 ? 200 : 180);
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value={44}>44h semanais (Divisor 220)</option>
                    <option value={40}>40h semanais (Divisor 200)</option>
                    <option value={36}>36h semanais (Divisor 180)</option>
                    <option value={30}>30h semanais (Divisor 150 - Estágio)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Escala / Horário de Trabalho</label>
                  <input
                    type="text"
                    value={escala}
                    onChange={e => setEscala(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  />
                </div>
              </div>

              {/* Benefícios & Dependentes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Benefícios Trabalhistas
                  </span>
                  <label className="flex items-center justify-between text-xs text-slate-700 font-medium">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={optanteVT}
                        onChange={e => setOptanteVT(e.target.checked)}
                      />
                      Vale Transporte (Desconto até 6%)
                    </span>
                    {optanteVT && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Custo R$ {valorVT}/mês
                      </span>
                    )}
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-700 font-medium">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={optanteVR}
                        onChange={e => setOptanteVR(e.target.checked)}
                      />
                      Vale Refeição / Alimentação (PAT)
                    </span>
                    {optanteVR && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        R$ {valorVR}/mês
                      </span>
                    )}
                  </label>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Dependentes para Fins de IRRF e Salário-Família
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={temDependente}
                      onChange={e => setTemDependente(e.target.checked)}
                    />
                    Possui dependente (Filho &lt; 14 anos ou cônjuge)
                  </label>

                  {temDependente && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Nome do dependente"
                        value={nomeDependente}
                        onChange={e => setNomeDependente(e.target.value)}
                        className="text-xs border border-slate-300 rounded p-1.5 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="CPF do dependente"
                        value={cpfDependente}
                        onChange={e => setCpfDependente(e.target.value)}
                        className="text-xs border border-slate-300 rounded p-1.5 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {etapa === 'DOCUMENTOS_CHECKLIST' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
                <p className="font-bold">Checklist de Conformidade de Admissão:</p>
                <p>
                  Confira os documentos recebidos do colaborador. Todos os itens obrigatórios validados habilitam a geração imediata do contrato de trabalho e inclusão na folha de pagamento.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {docsChecklist.map((doc, idx) => (
                  <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={doc.recebido}
                        onChange={() => toggleDoc(idx)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{doc.nome}</div>
                        <span className="text-[10px] text-slate-500">
                          {doc.obrigatorio ? 'Obrigatório para o eSocial' : 'Opcional'}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      doc.recebido ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {doc.recebido ? 'Validado' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div>
            {etapa !== 'DADOS_PESSOAIS' && (
              <button
                type="button"
                onClick={() => setEtapa(etapa === 'DOCUMENTOS_CHECKLIST' ? 'VINCULO_CONTRATO' : 'DADOS_PESSOAIS')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Voltar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {etapa !== 'DOCUMENTOS_CHECKLIST' ? (
              <button
                type="button"
                onClick={() => setEtapa(etapa === 'DADOS_PESSOAIS' ? 'VINCULO_CONTRATO' : 'DOCUMENTOS_CHECKLIST')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              >
                Avançar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSalvarEAdmitir(false)}
                  disabled={carregando}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                >
                  Salvar em Rascunho / Admissão
                </button>
                <button
                  type="button"
                  onClick={() => handleSalvarEAdmitir(true)}
                  disabled={carregando}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  {carregando ? 'Admitindo...' : 'Aprovar Admissão & Emitir Contrato'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
