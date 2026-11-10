import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Sparkles, Send, Bot } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  competenciaAtual: string;
}

export const AIAssistantModal: React.FC<Props> = ({ isOpen, onClose, competenciaAtual }) => {
  const [pergunta, setPergunta] = useState('');
  const [mensagens, setMensagens] = useState<{ remetente: 'usuario' | 'ia'; texto: string }[]>([
    {
      remetente: 'ia',
      texto: `Olá! Sou o Assistente Especialista em Legislação Trabalhista e Departamento Pessoal do **Departamento Fácil**.\n\nPosso ajudar você a:\n• Entender memórias de cálculo de INSS progressivo, IRRF simplificado vs legal e FGTS\n• Tirar dúvidas sobre a CLT, prazos do eSocial e regras de rescisão\n• Analisar atestados médicos e impactos em folha e período aquisitivo de férias\n• Validar convenções coletivas e horas extras.\n\nQual é a sua dúvida para a competência ${competenciaAtual}?`,
    },
  ]);
  const [carregando, setCarregando] = useState(false);

  if (!isOpen) return null;

  const enviarMensagem = async (textoParaEnviar?: string) => {
    const texto = textoParaEnviar || pergunta;
    if (!texto.trim() || carregando) return;

    const novas = [...mensagens, { remetente: 'usuario' as const, texto }];
    setMensagens(novas);
    setPergunta('');
    setCarregando(true);

    try {
      const res = await api.consultarIA(texto, { competencia: competenciaAtual });
      setMensagens([...novas, { remetente: 'ia', texto: res.resposta }]);
    } catch {
      setMensagens([
        ...novas,
        { remetente: 'ia', texto: 'Houve um erro ao processar a consulta. Verifique sua conexão.' },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  const perguntasRapidas = [
    'Como funciona a opção pelo Desconto Simplificado do IRRF (Lei 14.663)?',
    'Qual a regra para rescisão com adiantamento salarial já pago no mês?',
    'Como calcular as férias quando o período de gozo atravessa dois meses?',
    'Qual o prazo de pagamento da rescisão no Artigo 477 da CLT?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[85vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Consultor Trabalhista & DP IA
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full">
                  CLT & eSocial
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Esclarecimentos instantâneos com embasamento jurídico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mensagens.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.remetente === 'usuario' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.remetente === 'ia' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[82%] p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-xs ${
                  msg.remetente === 'usuario'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700'
                }`}
              >
                {msg.texto}
              </div>
            </div>
          ))}

          {carregando && (
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 italic p-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              Consultando jurisprudência e normas técnicas vigentes...
            </div>
          )}
        </div>

        {/* Sugestões Rápidas */}
        <div className="px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-1.5">Dúvidas Frequentes:</span>
          <div className="flex flex-wrap gap-1.5">
            {perguntasRapidas.map((item, idx) => (
              <button
                key={idx}
                onClick={() => enviarMensagem(item)}
                className="text-[11px] bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg transition-colors text-left"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Input */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
          <input
            type="text"
            value={pergunta}
            onChange={e => setPergunta(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviarMensagem()}
            placeholder="Digite sua dúvida sobre cálculos, rescisão, férias ou regras do eSocial..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => enviarMensagem()}
            disabled={!pergunta.trim() || carregando}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
            title="Enviar Pergunta"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
