# Painel Diário — Clodoaldo

Aplicativo local, responsivo e instalável para organizar trabalho, estudos, simulados, Instagram, saúde e finanças.

## Abrir no Mac

1. Extraia o arquivo ZIP.
2. Abra a pasta `Painel_Diario_Clodoaldo`.
3. Dê dois cliques em `ABRIR_NO_MAC.command`.
4. Se o macOS bloquear na primeira vez, clique com o botão direito no arquivo, escolha **Abrir** e confirme.

## Abrir no Windows

1. Extraia o arquivo ZIP.
2. Abra a pasta `Painel_Diario_Clodoaldo`.
3. Dê dois cliques em `ABRIR_NO_WINDOWS.bat`.

## Alternativa manual

Execute:

```bash
python3 iniciar_painel.py
```

O navegador abrirá em `http://localhost:8765`.

## Instalar como aplicativo

No Chrome ou Edge, abra o painel e use a opção **Instalar aplicativo** no menu do navegador. No celular, use **Adicionar à tela inicial**.

## Usar no celular

1. Computador e celular devem estar na mesma rede Wi‑Fi.
2. Abra o painel no computador.
3. A janela mostrará um endereço parecido com `http://192.168.1.10:8765`.
4. Digite esse endereço no navegador do celular.
5. O computador precisa permanecer ligado e a janela do painel deve continuar aberta.

## Notificações

Clique em **Ativar notificações**. Nesta versão, os avisos funcionam enquanto o painel estiver aberto no navegador.

Horários iniciais, todos editáveis:

- início do trabalho: 08:00;
- fim do expediente: 14:00;
- início do estudo: 16:30;
- revisão final: 21:30;
- hidratação: lembrete periódico.

## Google Agenda

Clique em **Exportar Google Agenda (.ics)**. Depois, importe o arquivo no Google Agenda.

## Notion

Clique em **Exportar para Notion (.csv)**. Depois, importe o arquivo como banco de dados no Notion.

## Dados e privacidade

Os dados ficam salvos no navegador do dispositivo. Faça backups periódicos pelo botão **Fazer backup (.json)**.

A sincronização direta e automática entre dispositivos, Google Agenda e Notion não está habilitada nesta primeira versão, pois exigiria login e credenciais de API.
