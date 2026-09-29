# CertiProof Preprod Users

**44 / 70** unique testers verified on Midnight Preprod.

Each row is a distinct wallet whose transaction is a successful `verifyCertificate` call on the CertiProof contract `d040bdc193d2cfcba02e94765c64eaddb16077cf072b556c8a4c440621956752`, checked against the public Preprod indexer by `npm run users` (`scripts/verify-users.ts`).

**How to verify a row yourself:** look up the transaction ID on the Preprod indexer:

```bash
curl -s https://indexer.preprod.midnight.network/api/v3/graphql -H 'content-type: application/json' \
  -d '{"query":"{ transactions(offset: {identifier: \"<TRANSACTION_ID>\"}) { hash block { height timestamp } contractActions { address ... on ContractCall { entryPoint } } } }"}'
```

It should show `address: d040bdc193d2cfcba02e94765c64eaddb16077cf072b556c8a4c440621956752` and `entryPoint: verifyCertificate`.

> The wallet address is reported by the tester's own wallet through the dApp (and entered in the feedback form); it does not appear inside a `verifyCertificate` transaction, since Midnight pays fees in shielded DUST. The transaction ID is the independently checkable on-chain proof.

| # | Wallet address (Preprod) | Transaction ID | Block | Time |
|---|---|---|---|---|
| 1 | `mn_addr_preprod10fs8ncdqhe9p3zk7mw387z67l2n6cn4zhjqh6svzr04cvhzvxjdqveay3f` | `004d3758951ae0860f58fe52d46e0fa2438a528fafd241c775cb784e9f07400dde` | 2750381 | 2026-09-28 18:26 UTC |
| 2 | `mn_addr_preprod17v0g8l33hctnr9umdxguq4g8yyuyhaev6q54wjqwsn3nxf8kxd2qxmv807` | `004a12f6bf130248ddd7cc8bc1c1af9e648715d5e3177420dd8eaef261d1ea3dcc` | 2752423 | 2026-09-28 21:50 UTC |
| 3 | `mn_addr_preprod15nxwx772rteaj7g0tpe9y2j5g2s9urrl2vutlq7t60yk2zrmwxksw5h7aa` | `004c91a4f9d739aba794f8f88642116e8430b090cf0b1f36404e126111ddf42ba0` | 2756060 | 2026-09-29 03:53 UTC |
| 4 | `mn_addr_preprod1x5p7vnpcr420pvdvczywg6x24khwey0t573kgcu2y4efqexq64xsflrzaj` | `00cab1e5013e1a4a252e067034d852909eb904dbecae072cb24266f7ea113485ea` | 2757378 | 2026-09-29 06:05 UTC |
| 5 | `mn_addr_preprod10cpewttf3a0c8cw88x29p3crj0mk0tk9t876lus4g8d5zlh5a3gq279cq0` | `0085d10307922cfcc501f1472a49540a04e45a813dd78145a7e7311fa0d3103880` | 2757463 | 2026-09-29 06:14 UTC |
| 6 | `mn_addr_preprod16dex8xwrm5jy4k0g904evzhqr7trthd0u392dhxj9yrlkraq8fxs22ezrh` | `001a4a8be885c32835bcc922158bbce333de5079a04c32a1fb805faace075274f0` | 2757606 | 2026-09-29 06:28 UTC |
| 7 | `mn_addr_preprod1xxc82f77netsg9ufgw0dgn6y7sg46kmxtctjxs4wvw24hv5lhx0q8phej0` | `00d547053a45a414983085bb692ad5bd9aec81b57801661a4739dde66be353690c` | 2757745 | 2026-09-29 06:42 UTC |
| 8 | `mn_addr_preprod1a6d99xl55vt3lqnu6njxnsjh6s8tj6qsu4ry7czk4ah8fd0zrmuq7nvdpd` | `00996f5ea99305beedca8405c609d3c866eea5e7549bfb678ba09c7b607a674fe5` | 2758364 | 2026-09-29 07:44 UTC |
| 9 | `mn_addr_preprod1knrn0t29ur07ez6dmhjc3uc909qmtul0eg50gtraasaw9m7nymls230qvx` | `00119df026fcd46b4c55e5da89bb60bf62482ebc920e86d4b9e8ab4ef6deb8f082` | 2760300 | 2026-09-29 10:57 UTC |
| 10 | `mn_addr_preprod1l5tgk05ak52rn29aq5lceqj9phevfrxmne8zmt6e7ww8w2694d8qhwe7w2` | `00ceb9346b3fb90ef883aa2151adc462ca9390f52170b8af340d1f38710a1fddb3` | 2760385 | 2026-09-29 11:06 UTC |
| 11 | `mn_addr_preprod19ns7gzq2s3pmxefzztc25fdacrx3kxz9yy6ewc0t2vj22afzezsqya2v3z` | `004cf0724860e5456aef38f5d64d1e258d9b7ca70adeb254efbacdf85498953a71` | 2760533 | 2026-09-29 11:21 UTC |
| 12 | `mn_addr_preprod1daa0vzqy5dasegea9g60de8ctew0yzys5amkx8qkuwl3xjend6tqv9um2t` | `00908c9ff43a58578f61ee96cd0261225eabd0e999bc1689afed1945ff351b2c36` | 2760750 | 2026-09-29 11:42 UTC |
| 13 | `mn_addr_preprod1v542jpqk2l4re6llprqntk8act8ucqmzemygqwrtj62shgujnxps7pssm0` | `00aa47d9aaf6aad2a76c2b830f4870ed91bbae6b0f870c771026e22d2ddf8e92e9` | 2760765 | 2026-09-29 11:44 UTC |
| 14 | `mn_addr_preprod13vx539zrmh58xfyltj8h566cwmcmxvdhcx56ufyx37un9fph8khqgflfvu` | `001128d3a11fe07fc06f586c4aa8d078e772f683975627c08cd973a96eebeed3ca` | 2760975 | 2026-09-29 12:05 UTC |
| 15 | `mn_addr_preprod1yqd9ffdxkzfmfqp2qajmj94qt9ww599stccu4slmtrfq2eqtl4ms8l9sxg` | `0073c16c415af665fa97e148b620f54b945de3dbb6318768a9a30ff44b61b48f90` | 2761883 | 2026-09-29 13:36 UTC |
| 16 | `mn_addr_preprod15vvdhj5flte5tyxvqnxr69snf3z3cwj8nv0vny8cd236urfudhpqgqyhvp` | `00bd2ae60dceaf5fae4dcbc5362376daaeddcfb4fdbb0d77d47a9b8e5b53c9c43b` | 2762184 | 2026-09-29 14:06 UTC |
| 17 | `mn_addr_preprod1v2e7pdxzenfr2segnz8dd9n9lsvjnfmxhncu7hv99s96tqc0aezqj826mj` | `00516738ce8dee6cc88b336b2e2cfbe09f887454414fbc9ae283ed30959f57955a` | 2762367 | 2026-09-29 14:24 UTC |
| 18 | `mn_addr_preprod1pc6wx8mmjlw8r43x0hu2gpzjyy7zlpf2r7f7wx3w3wymwev4z0qsch2zzd` | `007d752164d574bf75b597c9b51ef431b21e0c3741ed2740f39682fd3c423174e4` | 2762675 | 2026-09-29 14:55 UTC |
| 19 | `mn_addr_preprod15r3u6dfshyx654j78yxaj863njtlqvp07nnhnqspfxvk0jh75ffqsn0cfy` | `00009be423380a3888e80780a410d5798a758f331c2bc1d89c3a4c38fc85f23b86` | 2762947 | 2026-09-29 15:22 UTC |
| 20 | `mn_addr_preprod1yxcp8zuc7ygzh8kez5qkjhwfa8k37wjcjmtsgdlaqtqsaqgg7s9qk0hekc` | `0028c3ab7cd3d8f3d4d9b86d6d09ce5114129cf098ead8050bd58eed8d100173c7` | 2763096 | 2026-09-29 15:37 UTC |
| 21 | `mn_addr_preprod149uta2gefras292hnxhvmzpuz7y9llyexpx3mwfqgwv8rzpdre2ql2drrp` | `00d5138cb48695a517c9ab7f4a3fcfde60eb8cbc91ecc61694230e695af605d404` | 2763134 | 2026-09-29 15:41 UTC |
| 22 | `mn_addr_preprod1ccmt9a6e56d6kqhll4x72qxze8fdcm4wrfzcwkkz65whlj3kkfhsx4m8n2` | `004ca296179fece6e995da70d1b79e23c9995240438f4e4a3f78c7a7811164bf34` | 2763468 | 2026-09-29 16:15 UTC |
| 23 | `mn_addr_preprod1cc3d66j473l3s8ej7pkex9vefuysqatundguhjeu5xa2w0fhj6ps8d3pts` | `00c9773fba1c031c1c4e1558b2c5cabbf0ff88bdb924f6f378ed068b9804e8d3c0` | 2763892 | 2026-09-29 16:57 UTC |
| 24 | `mn_addr_preprod1neqdxgpfga5mv9e5p0ntvcgnqj3awy5pyp6xz7em7x7tp4ymrdlqen0tnz` | `00f9c2b8d161d23bcc9931f9e7ce45172112fb6ef6b4b9ac6e640c16794c3e5997` | 2763945 | 2026-09-29 17:02 UTC |
| 25 | `mn_addr_preprod1z8xpskvt9k4twce8ykm0jusyvgs3eh7dgu85u6amdddj0juqrmlsdkhemx` | `00a78e31ad2dd262af9160828e8fcdfcfbb83188a88b0eb28a0bc03a7f24c7a0ef` | 2764151 | 2026-09-29 17:23 UTC |
| 26 | `mn_addr_preprod1h23kmmpglkezf63rg0rz5uh27rmzj8n3aj8ncpkjz3gjvcuv0geq774eu0` | `008faec0a7a295523a5f7aa4ba0ea68228869924cac130671e95516225b5996edc` | 2764206 | 2026-09-29 17:28 UTC |
| 27 | `mn_addr_preprod1skq0u6lcztwkrzxgxjps0r8syd3lcu5sf37kglmx34983ptsgjfqw0cus2` | `00342b9f2d013c79745631e3987edcd0cbfe92e3abb6e89c74098b6f9992061a1d` | 2764249 | 2026-09-29 17:33 UTC |
| 28 | `mn_addr_preprod1p97sk7gn9ypstkqrkrs8kh2kq2g03nwfqw6v0n2rc2vcqtyz5ussqmt03v` | `009e84da16dd375edfc7c50ae6eb2a6742835fdd01111a4f271ec7ac98ead15734` | 2764334 | 2026-09-29 17:41 UTC |
| 29 | `mn_addr_preprod16vm98s0upshl6kjmxpzv67zd3r3vutehtz0lf9ktgml0w29epafsjku8yq` | `00d2f7f0eaf6177d3a66f11a89655bf29ef16dc3e72a459aeb906f3ea06b5f4fc0` | 2764383 | 2026-09-29 17:46 UTC |
| 30 | `mn_addr_preprod14mjc3jwaujhp9ccks3znqgkcvg58l95zj3xnnlru75eu8l8e3t0snh0dc4` | `00b6e9dcf6e75a756e004e30b7ba832f8dd8bba2ed00005fc9a63e168086fc4f2c` | 2764416 | 2026-09-29 17:49 UTC |
| 31 | `mn_addr_preprod1fgz923eevlrxmfrhkrhzwz8c309sl3su35y4qg52gngxtc9xhq5skz58d9` | `004170b09e45b0e4a69540cdc3bcf63eafd286a6e34dcbef7649fce093ab11429c` | 2764500 | 2026-09-29 17:58 UTC |
| 32 | `mn_addr_preprod15n2eanuwjgcyh80jxhejn47n85ryv0ulra2k3m7yzdgcdy8w07ls70p5ds` | `00e363c25e21ce62b267049b02e5921e47dc2cd430933c8edc134e3cadfd0c35ae` | 2764629 | 2026-09-29 18:11 UTC |
| 33 | `mn_addr_preprod14p72c86uxf9fylu9wgzwf9a4mgmyczsqc39nhw2cxgmeh2unjpeq9ppcay` | `009c6252c5797cc6be50b4b194c565c51c465a9a88d15a85dbd4530bf4298ef0d8` | 2764669 | 2026-09-29 18:15 UTC |
| 34 | `mn_addr_preprod1ep683x6s8rqnhe7zq6va3z35u3pcfzmlsg2hkruuqxkjw36f9etqa3zge6` | `001d69e3c1b71d95740b1c1c17ffef01e9fc108a14ae0d3ada608619de08466792` | 2764689 | 2026-09-29 18:17 UTC |
| 35 | `mn_addr_preprod1k8shztzxvl9k4lt62x6qhl7m260l405rjxl2fx28gjm0ds2qfkhqt7s2x8` | `004dfd36ec171239bde5419c35a38fc4fe5e341ae20fa4310bca8054e3ee1b2717` | 2764750 | 2026-09-29 18:23 UTC |
| 36 | `mn_addr_preprod1dn7fwmhacwfznn72ertvwk9pt7q74pflsfurv62nm2lfe2agdxyq5fskel` | `00a48923c3d3b2c237d4848c3054d4fe94bd1ff9436130f9584cdeb6cfd13847a4` | 2764845 | 2026-09-29 18:32 UTC |
| 37 | `mn_addr_preprod17dcre0t74l79da3wzpkez5cv9fl07s43vgm08levkgtcsymmnkpssa9da4` | `00a0979928fe84a8bef6281c9e21ce01c5d76c769c2e2cebda7dab0243f6377e5d` | 2764858 | 2026-09-29 18:34 UTC |
| 38 | `mn_addr_preprod1dttzqwk5fnddxml7pjygmjnzt77e5yg9n7ehagl3xh0qpja0nlrqdlvdn3` | `009da7f316a71daa5908547d151048e72036f3b7b4ceb02cac5e2897de22780e53` | 2765044 | 2026-09-29 18:52 UTC |
| 39 | `mn_addr_preprod1emxq3zu2469elwfdfcp07acrfslgpt0dcr803y8cgh80kr3t0pjq2fcp52` | `00c7964cf312483469100a5cce7c462bd8bc7f2a52e8c89301d23ba7c68e6a141e` | 2765202 | 2026-09-29 19:08 UTC |
| 40 | `mn_addr_preprod1hzl7qdsw269j67fkxwwltzh87czyek5yrhulphhmjhmcfd00eufqpqv5ws` | `00b8daf1de2bf638db632f8f1291d8e6e9572cd6ece8891b3dc30333814781b567` | 2765326 | 2026-09-29 19:20 UTC |
| 41 | `mn_addr_preprod19vucz3envtmfa87rjtpeupy7u73525pe3mc6py600t3fuejrvgdqyvqnep` | `00f703b8001382bdeff33031a20e5fdee8adbf405a21174357b0fc23727e9e5037` | 2765546 | 2026-09-29 19:42 UTC |
| 42 | `mn_addr_preprod19lh98s2kdhsnxfvuczhu0vt8w8j6ywj8lzqr8n40mzm8s7mpcg6s40e4ru` | `00178900eb783ecd855047bf7f503a9001c9a6cdffecde6735e10a2cc62e9c0fcf` | 2765741 | 2026-09-29 20:02 UTC |
| 43 | `mn_addr_preprod1nz6fkz4qrcvpg44e6sh68rzhqshak63u7du8gqgmkpv59pp53hmqc4putz` | `00723318cd6b3ada07bacd3a93e89cf53e03dbfadc30193fd6028c796cf1cbbada` | 2765923 | 2026-09-29 20:20 UTC |
| 44 | `mn_addr_preprod1d2zse7nls3qmnds3ef0zxuzzl9mfpls7kfc9fu0qhkrfj4s4c6yqjtuws8` | `007b670ac87416d85d512036254d13b30a24b9748d082775ff7dfba14b71341153` | 2766074 | 2026-09-29 20:35 UTC |
