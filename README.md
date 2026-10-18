# Cifras dos Crentes — versão local

Esta é uma cópia independente do código exportado do site. Ela preserva as páginas e os recursos que já existiam e usa o mesmo projeto Supabase quando as variáveis de ambiente são configuradas. Alterações feitas aqui não alteram o site publicado no Lovable.

## O que o app oferece

- Consulta, busca, criação, edição e versões de cifras.
- Artistas, playlists compartilhadas, anotações e impressão.
- Transposição, capotraste, afinação, colunas, tamanho/alinhamento do texto e rolagem por BPM.
- Login por usuário e senha, armazenamento local das playlists recentes e suporte offline no site publicado.
- Ferramentas musicais: campo harmônico, círculo de quintas, identificação de acorde, afinador, metrônomo e catálogo de acordes.

## Rodar no computador

1. Instale Node.js 22.12 ou mais recente.
2. Copie `.env.example` para `.env` e preencha as variáveis com os valores do projeto Supabase existente.
3. Execute `npm install` e depois `npm run dev`.
4. Abra o endereço local mostrado pelo Vite.

O endereço do site local também precisa ser incluído nas URLs autorizadas de redirecionamento de autenticação do Supabase. Não publique `.env` e não coloque uma chave `service_role` em variáveis com prefixo `VITE_`.

## Publicação fora do Lovable

O app usa TanStack Start com Vite e Nitro e pode ser hospedado num serviço compatível com aplicação Node. Configure no serviço as mesmas variáveis Supabase do `.env.example`, o comando `npm run build` e o diretório/saída que o serviço pedir para aplicações TanStack Start/Nitro. A URL pública também precisa entrar na configuração de redirecionamento de autenticação do Supabase.

## Precisão musical

A biblioteca usa intervalos diatônicos escritos (por exemplo, `1 · 3 · 5 · ♭7 · ♭9`) e mostra os nomes das notas respeitando essa escrita. A fórmula explica quais graus compõem o acorde; no instrumento, as notas podem aparecer em outra ordem ou com duplicações. A identificação a partir do braço é limitada às fórmulas cadastradas e pode deixar de reconhecer voicings incompletos ou acordes com notas omitidas.
