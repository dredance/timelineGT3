'use strict'


import powerbi from "powerbi-visuals-api"
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import ISelectionId = powerbi.extensibility.ISelectionId

export interface VMargins {
    top: number,
    bottom: number,
    right: number,
    left: number,
}

export interface VData {
    items: VDataItem[],
    minDate: Date,
    maxDate: Date,
    period: Date,
    formatString: string,
}


export interface VDataItem {
    index: number,
    task_name: string,
    group_name: string,
    start_plan: Date,
    end_plan: Date,
    start_curr: Date,
    end_curr: Date,
    value_plan: number,
    value_fcst: number,
    pct_real: number,
    pct_plan: number,
    color: string,
    selectionId: ISelectionId,
    // highlighted: boolean
}


export function transformData(options: VisualUpdateOptions, host: IVisualHost): VData {
    let data: VData
    try {
        const dv = options.dataViews[0].categorical
        const minDate = new Date(<Date>dv.values[1].values[0])
        const maxDate =new Date(<Date>dv.values[2].values[0])//Math.max(<number>dv.values[0].maxLocal, <number>dv.values[1].maxLocal)
        const period = new Date(<Date>dv.values[0].values[0])
        let items: VDataItem[] = []
        let color: string
        for (let i = 0; i < dv.categories[0].values.length; i++) {
                const selectionId = host.createSelectionIdBuilder()
                .withCategory(dv.categories[0], i)
                .createSelectionId();
                const color =  '#000000'
                items.push({
                index : i,
                task_name: <string>dv.categories[0].values[i],
                group_name: <string>dv.values[3].values[i],
                start_plan: new Date(<Date>dv.values[4].values[i]),
                end_plan: new Date(<Date>dv.values[5].values[i]),
                start_curr: new Date(<Date>dv.values[6].values[i]),
                end_curr: new Date(<Date>dv.values[7].values[i]),
                value_plan: <number>dv.values[8].values[i],
                value_fcst: <number>dv.values[9].values[i],
                pct_real: <number>dv.values[10].values[i],
                pct_plan: <number>dv.values[11].values[i],
                color,
                selectionId,
                // highlighted
            })
        }
        // sortowanie po category (dodanie nowego indexu)
        items.sort((a,b)=>a.start_plan.getTime()-b.start_plan.getTime()).map((obj:any, index:number) => {
            obj.index = index;
            return obj;
        });
        data = {
            items,
            minDate,
            maxDate,
            period,
            formatString: dv.values[10].source.format || '',
        }
    } catch (error) {
        data = {
            items: [],
            minDate: null,
            maxDate: null,
            period: null,
            formatString: '',
        }
    }
    return data
}