# Modo escuro da gestão

O botão de lua/sol no topo da gestão alterna entre o modo claro e o escuro.

- A escolha fica salva no navegador, na chave `gestao:tema` do `localStorage`, e vale também na tela de login.
- Sem escolha salva, a gestão segue o tema do sistema.
- O modo escuro é o do Quasar (`$q.dark`). Os componentes do Quasar mudam de cor sozinhos.
- O código está em `src/utils/tema.js`, `src/App.vue` e no botão em `src/layouts/MainLayout.vue`.

## Cores próprias das telas

As classes claras do Quasar usadas como fundo de painel viram as equivalentes escuras em `src/css/app.scss`. São elas:

- `bg-white`, `bg-grey-1`, `bg-grey-2` e `bg-grey-3`;
- `bg-blue-1`, `bg-red-1`, `bg-amber-1` e `bg-orange-1`;
- `text-grey-8`, `text-grey-9` e `text-negative`.

Uma tela nova que use cor escrita no CSS precisa da versão escura no próprio `<style scoped>`, com `.body--dark` na frente:

```css
.resumo {
  background: #e3f2fd;
}
.body--dark .resumo {
  background: rgba(25, 118, 210, 0.15);
}
```

Não use `:global(.body--dark) .resumo`. O Vue compila isso como só `.body--dark`, e a cor vai para a página inteira.

Em SVG, o CSS vence a cor escrita no atributo. Por isso basta pôr uma classe no elemento e a cor do modo escuro no CSS, como nos rótulos do gráfico de Ganhos da plataforma.
