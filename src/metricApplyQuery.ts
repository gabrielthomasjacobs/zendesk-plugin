import { ScopedVars } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { cloneDeep } from 'lodash';
import { ZendeskQuery } from 'types';

export class ZendeskMetricApplyQuery {
  query;
  variables;
  scopedVars;
  constructor(query: ZendeskQuery, scopedVars?: ScopedVars) {
    this.query = query;    
    this.variables = getTemplateSrv().getVariables();
    this.scopedVars = scopedVars;
  }

  getFormattedVariables(): Record<string, string[]> {
    const entries = this.variables.map(
      (v: any) => {
        const varName = v.query.value;
        const value = Array.isArray(v.current.value) ? v.current.value : [v.current.value];
        return [varName, value]
      }
    );
    return Object.fromEntries(entries);
  }

  setScopedVars(){
    this.scopedVars ??= {};
    const formattedVars = this.getFormattedVariables();
    const fields  = Object.keys(formattedVars);
    for(let fieldName of fields) {
      this.scopedVars[fieldName] = {
          value: `${formattedVars[fieldName].map(v => `${fieldName}:${v}`).join(' ')}`, 
          text: formattedVars[fieldName]}
    }
  }

  applyTemplateVariables(): ZendeskQuery {
    this.setScopedVars();
    const fields  = Object.keys(this.getFormattedVariables());
    let querystring = this.query.querystring;
    fields.forEach((fieldName: string) => {
      // for each template variable field, 
      // remove any existing instances of the field from the querystring then re-add the dynamic filter for that field
      querystring = querystring.replace(new RegExp(`${fieldName}:[^ ]+`, 'g'), '');
      querystring += ` $${fieldName}`
    })
    const updatedQuerystring = getTemplateSrv().replace(querystring, this.scopedVars)
  
    const updatedQuery = cloneDeep(this.query);
    updatedQuery.querystring = updatedQuerystring;
    return updatedQuery;
  }
}
