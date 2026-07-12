 Servidor atual:
  - CPU: i5-3337U 2 nucleos e 4 threads
  - GPU: GT 625M 1GB DE VRAM
  - RAM: 6GB DDR3L 1600Mhz
  - ARMAZENAMENTO: HD 1TB
 
 
 
 O maior gargalo geral é o HD mecânico. Para a transcrição especificamente, o maior gargalo durante o processamento será o processador.

  Ordem prática dos gargalos:

  1. HD mecânico
      - Docker, PostgreSQL, Redis e Next fazem muitos acessos pequenos e aleatórios.
      - Uploads grandes são gravados enquanto FFmpeg lê e produz outro arquivo.
      - Builds, inicialização dos containers e migrações ficam sensivelmente lentos.
      - Um SSD SATA, mesmo simples, seria o upgrade com maior impacto geral.

  2. CPU i5-3337U
      - São apenas 2 núcleos/4 threads de uma arquitetura antiga e de baixo consumo.
      - Extração e conversão com FFmpeg podem ocupar um núcleo inteiro por bastante tempo.
      - A configuração atual de Celery com concorrência 1 é adequada.
      - A AssemblyAI faz a transcrição pesada remotamente, então o servidor não precisa executar o modelo de IA.

  3. RAM de 6 GB
      - É suficiente para a configuração atual com cautela.
      - PostgreSQL, Next.js, Django/Gunicorn, Redis e Celery juntos deixam pouca margem para cache do sistema.
      - Uploads não devem ser carregados integralmente na memória.
      - Se houver swap no HD, qualquer pressão de memória pode deixar o servidor extremamente lento.

  4. Internet de upload
      - Pode acabar sendo o maior limitador de tempo, dependendo da sua conexão.
      - O áudio normalizado precisa ser enviado do servidor para a AssemblyAI.
      - Converter para MP3 mono, 16 kHz e 64 kbps reduz bastante esse impacto.

  Em resumo:

  Lentidão geral do servidor: HD
  Processamento local da transcrição: CPU
  Risco de travamento sob carga: RAM/swap
  Tempo de envio à AssemblyAI: internet de upload

  O melhor upgrade seria trocar o HD por SSD. Depois, se possível, aumentar para pelo menos 8 GB de RAM. O processador não é rápido, mas o fluxo atual foi desenhado para contornar isso
  usando apenas um FFmpeg por vez e deixando a IA na AssemblyAI.
