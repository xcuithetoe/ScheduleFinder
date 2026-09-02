# UCLA Schedule of Classes Term Codes and Parameters

## Term Codes Format: `YY[T]`
The UCLA Registrar uses a 3-character term code:
* `YY` = 2-digit academic year (e.g., `26` for 2026, `27` for 2027)
* `[T]` = Term identifier:
  - `F`: Fall Quarter (e.g. `26F` = Fall 2026)
  - `W`: Winter Quarter (e.g. `26W` = Winter 2026, `27W` = Winter 2027)
  - `S`: Spring Quarter (e.g. `26S` = Spring 2026, `27S` = Spring 2027)
  - `1`: Summer Sessions (e.g. `261` = Summer Sessions 2026, All Sessions / Session A)
  - `2`: Summer Quarter (e.g. `262` = Summer 2026)

## SOC Search URL Structure
To search classes by subject area directly:
```
https://sa.ucla.edu/ro/public/soc/Results?SubjectAreaName=<SUBJECT_NAME>&t=<TERM_CODE>&s_g_cd=%25&sBy=subject&subj=<SUBJECT_CODE_PADDED>&catlg=&cls_no=&undefined=Go&btnIsInIndex=btn_inIndex
```

### Examples:
- **Math Fall 2026**:
  `https://sa.ucla.edu/ro/public/soc/Results?SubjectAreaName=Mathematics+(MATH)&t=26F&s_g_cd=%25&sBy=subject&subj=MATH+++&catlg=&cls_no=&undefined=Go&btnIsInIndex=btn_inIndex`
- **Computer Science Winter 2027**:
  `https://sa.ucla.edu/ro/public/soc/Results?SubjectAreaName=Computer+Science+(COM+SCI)&t=27W&s_g_cd=%25&sBy=subject&subj=COM+SCI&catlg=&cls_no=&undefined=Go&btnIsInIndex=btn_inIndex`

## DOM Architecture Note
* UCLA Schedule of Classes uses a Shadow DOM web component: `<ucla-sa-soc-app>`.
* All course containers and data rows reside inside `document.querySelector('ucla-sa-soc-app').shadowRoot`.
* Each lecture row has class `.row-fluid.data_row.primary-row`.
* Each discussion row has class `.row-fluid.data_row.secondary-row`.
* Clicking the lecture checkbox triggers expansion/visibility of its discussion sections.
